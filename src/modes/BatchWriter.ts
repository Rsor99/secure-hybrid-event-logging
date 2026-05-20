import { LogStorage, WriteResult, BatchWriteResult, WriteOpts } from '../core/LogStorage';
import { LogEntry } from '../core/LogEntry';

interface PendingEntry {
  entry: LogEntry;
  resolve: (r: WriteResult) => void;
  reject:  (e: Error) => void;
}

export type FlushCallback = (result: BatchWriteResult) => void | Promise<void>;

export class BatchWriter {
  private buffer: PendingEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly storage: LogStorage,
    private readonly maxSize = 50,
    private readonly flushIntervalMs = 1000,
    private readonly opts?: WriteOpts,
    private readonly onFlush?: FlushCallback,
  ) {}

  // Returns a Promise that resolves once the entry's enclosing batch has been
  // written to storage. Lets HTTP callers wait for DB persistence even though
  // the actual write happens asynchronously when the batch fills or the timer fires.
  write(entry: LogEntry): Promise<WriteResult> {
    return new Promise<WriteResult>((resolve, reject) => {
      this.buffer.push({ entry, resolve, reject });
      if (this.buffer.length >= this.maxSize) {
        this.flush().catch(() => {});
      } else {
        this.scheduleFlush();
      }
    });
  }

  async flush(): Promise<BatchWriteResult | null> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.buffer.length === 0) return null;

    const pending = this.buffer.splice(0);
    const entries = pending.map((p) => p.entry);

    try {
      if (this.storage.writeBatch) {
        const result = await this.storage.writeBatch(entries, this.opts);
        // Each entry in the batch shares the same chain tx — report it back per-entry.
        for (const p of pending) {
          p.resolve({
            logId:     p.entry.id,
            success:   result.success,
            latencyMs: result.latencyMs,
            txId:      result.txId,
            confirmed: result.confirmed,
            error:     result.error,
          });
        }
        if (this.onFlush) await this.onFlush(result);
        return result;
      }
      // Anchored-mode hybrids without writeBatch: per-entry writeLog.
      const results = await Promise.all(entries.map((e) => this.storage.writeLog(e, this.opts)));
      for (let i = 0; i < pending.length; i++) {
        pending[i].resolve(results[i]);
      }
      return null;
    } catch (err) {
      for (const p of pending) p.reject(err as Error);
      throw err;
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush().catch(() => {});
    }, this.flushIntervalMs);
  }
}

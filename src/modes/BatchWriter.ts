import { LogStorage, WriteResult, BatchWriteResult } from '../core/LogStorage';
import { LogEntry } from '../core/LogEntry';

export class BatchWriter {
  private buffer: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private lastBatchResult: BatchWriteResult | null = null;

  constructor(
    private readonly storage: LogStorage,
    private readonly maxSize = 50,
    private readonly flushIntervalMs = 1000,
  ) {}

  write(entry: LogEntry): WriteResult {
    this.buffer.push(entry);
    if (this.buffer.length >= this.maxSize) {
      this.flush().catch(() => {});
    } else {
      this.scheduleFlush();
    }
    return { logId: entry.id, success: true, latencyMs: 0 };
  }

  async flush(): Promise<BatchWriteResult | null> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.buffer.length === 0) return null;

    const batch = this.buffer.splice(0);

    if (this.storage.writeBatch) {
      this.lastBatchResult = await this.storage.writeBatch(batch);
    } else {
      await Promise.all(batch.map((e) => this.storage.writeLog(e)));
      this.lastBatchResult = null;
    }

    return this.lastBatchResult;
  }

  getLastBatchResult(): BatchWriteResult | null {
    return this.lastBatchResult;
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush().catch(() => {});
    }, this.flushIntervalMs);
  }
}

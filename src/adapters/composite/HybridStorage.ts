import { LogStorage, WriteResult, VerifyResult, BatchWriteResult, MetricsProvider, isMetricsProvider } from '../../core/LogStorage';
import { LogEntry } from '../../core/LogEntry';
import { HashService } from '../../core/HashService';

export class HybridStorage implements LogStorage, MetricsProvider {
  readonly name: string;

  constructor(
    private readonly db: LogStorage,
    private readonly anchor: LogStorage,
  ) {
    this.name = `Hybrid(${db.name}+${anchor.name})`;
  }

  async initialize(): Promise<void> {
    await this.db.initialize?.();
  }

  async writeLog(entry: LogEntry): Promise<WriteResult> {
    const start = Date.now();
    if (!entry.dataHash) entry.dataHash = HashService.computeLogHash(entry);
    const dbResult = await this.db.writeLog(entry);
    if (!dbResult.success) return dbResult;
    const anchorResult = await this.anchor.writeLog(entry);
    return {
      logId: entry.id,
      success: true,
      latencyMs: Date.now() - start,
      txId: anchorResult.txId,
      confirmed: anchorResult.confirmed,
    };
  }

  async writeBatch(entries: LogEntry[]): Promise<BatchWriteResult> {
    if (entries.length === 0) {
      return { batchHash: '', startId: '', endId: '', count: 0, success: false, latencyMs: 0, error: 'Empty batch' };
    }
    const start = Date.now();

    for (const e of entries) {
      if (!e.dataHash) e.dataHash = HashService.computeLogHash(e);
    }

    // Write each entry to DB individually (full log preserved)
    if (this.db.writeBatch) {
      await this.db.writeBatch(entries);
    } else {
      await Promise.all(entries.map((e) => this.db.writeLog(e)));
    }

    // Write ONE batch hash to blockchain
    const batchHash = HashService.computeBatchHash(entries);
    const startId = entries[0].id;
    const endId = entries[entries.length - 1].id;

    let txId: string | undefined;
    let confirmed: boolean | undefined;
    let anchorSuccess = true;

    if (this.anchor.writeBatch) {
      const anchorResult = await this.anchor.writeBatch(entries);
      txId = anchorResult.txId;
      confirmed = anchorResult.confirmed;
      anchorSuccess = anchorResult.success;
    } else {
      const syntheticEntry = new LogEntry({
        level: entries[0].level,
        source: 'hybrid-batch',
        message: `batch:${entries.length}:${startId}:${endId}`,
        dataHash: batchHash,
      });
      const anchorResult = await this.anchor.writeLog(syntheticEntry);
      txId = anchorResult.txId;
      confirmed = anchorResult.confirmed;
      anchorSuccess = anchorResult.success;
    }

    for (const e of entries) {
      e.blockchainTxId = txId ?? null;
      e.blockchainConfirmed = confirmed ?? false;
    }

    return {
      batchHash,
      startId,
      endId,
      count: entries.length,
      success: anchorSuccess,
      latencyMs: Date.now() - start,
      txId,
      confirmed,
    };
  }

  async verifyLog(id: string): Promise<VerifyResult> {
    return this.db.verifyLog(id);
  }

  async readLog(id: string): Promise<LogEntry | null> {
    return this.db.readLog(id);
  }

  async close(): Promise<void> {
    await this.db.close?.();
  }

  getAvgConfirmationTimeMs(): number {
    return isMetricsProvider(this.anchor) ? this.anchor.getAvgConfirmationTimeMs() : 0;
  }
}

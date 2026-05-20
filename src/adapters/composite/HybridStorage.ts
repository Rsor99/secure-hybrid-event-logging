import {
  LogStorage,
  WriteResult,
  VerifyResult,
  BatchWriteResult,
  MetricsProvider,
  WriteOpts,
  isMetricsProvider,
} from '../../core/LogStorage';
import { LogEntry } from '../../core/LogEntry';
import { HashService } from '../../core/HashService';
import {
  PostgresAdapter,
  BatchRow,
  TBL_ANCHORED_PRIVATE,
  TBL_ANCHORED_PUBLIC,
  TBL_BATCHED_PRIVATE,
  TBL_BATCHED_PUBLIC,
  TBL_BATCHES_PRIVATE,
  TBL_BATCHES_PUBLIC,
} from '../../infrastructure/database/PostgresAdapter';
import { MongoAdapter } from '../../infrastructure/database/MongoAdapter';

export type HybridMode = 'anchored_private' | 'anchored_public' | 'batched_private' | 'batched_public';

const LEVEL_INT: Record<string, number> = {
  DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, CRITICAL: 4,
};

function tablesFor(mode: HybridMode): { logTable: string; batchesTable: string } {
  switch (mode) {
    case 'anchored_private': return { logTable: TBL_ANCHORED_PRIVATE, batchesTable: TBL_BATCHES_PRIVATE };
    case 'anchored_public':  return { logTable: TBL_ANCHORED_PUBLIC,  batchesTable: TBL_BATCHES_PUBLIC  };
    case 'batched_private':  return { logTable: TBL_BATCHED_PRIVATE,  batchesTable: TBL_BATCHES_PRIVATE };
    case 'batched_public':   return { logTable: TBL_BATCHED_PUBLIC,   batchesTable: TBL_BATCHES_PUBLIC  };
  }
}

export class HybridStorage implements LogStorage, MetricsProvider {
  readonly name: string;
  readonly writeBatch?: (entries: LogEntry[], opts?: WriteOpts) => Promise<BatchWriteResult>;
  private readonly logTable: string;
  private readonly batchesTable: string;
  private readonly anchoringDelays: number[] = [];

  constructor(
    private readonly db: PostgresAdapter | MongoAdapter,
    private readonly anchor: LogStorage,
    private readonly mode: HybridMode,
  ) {
    const tables = tablesFor(mode);
    this.logTable     = tables.logTable;
    this.batchesTable = tables.batchesTable;
    this.name = `Hybrid(${db.name}+${anchor.name},${mode})`;
    if (mode.startsWith('batched')) {
      this.writeBatch = this._writeBatch.bind(this);
    }
  }

  async initialize(): Promise<void> {
    await this.db.initialize();
  }

  // ── writeLog (anchored mode) ────────────────────────────────────────────────

  async writeLog(entry: LogEntry, opts?: WriteOpts): Promise<WriteResult> {
    const start = Date.now();
    if (!entry.dataHash) entry.dataHash = HashService.computeLogHash(entry);
    const contentHash = entry.dataHash;

    try {
      await this.db.insertAnchored(entry, contentHash, this.logTable);
      const tDbDone = Date.now();

      const anchorResult = await this.anchor.writeLog(entry, opts);
      this.anchoringDelays.push(Date.now() - tDbDone);

      const txHash = anchorResult.txId;
      const status = anchorResult.confirmed ? 'confirmed' : anchorResult.success ? 'pending' : 'failed';
      const anchAt = anchorResult.confirmed ? new Date() : undefined;
      await this.db.updateAnchorStatus(entry.id, status, txHash, undefined, anchAt, this.logTable);

      return {
        logId: entry.id,
        success: true,
        latencyMs: Date.now() - start,
        txId: anchorResult.txId,
        confirmed: anchorResult.confirmed,
      };
    } catch (err) {
      return { logId: entry.id, success: false, latencyMs: Date.now() - start, error: String(err) };
    }
  }

  // ── _writeBatch (batched mode only — exposed via this.writeBatch for batched_* modes) ──

  private async _writeBatch(entries: LogEntry[], opts?: WriteOpts): Promise<BatchWriteResult> {
    if (entries.length === 0) {
      return { batchHash: '', startId: '', endId: '', count: 0, success: false, latencyMs: 0, error: 'Empty batch' };
    }
    const start = Date.now();

    try {
      // Compute per-entry hashes
      for (const e of entries) {
        if (!e.dataHash) e.dataHash = HashService.computeLogHash(e);
      }

      // Insert all log entries as batched records
      await Promise.all(entries.map(e => this.db.insertBatched(e, e.dataHash, this.logTable)));

      // Compute Merkle root
      const merkleRoot = HashService.computeBatchHash(entries);
      const startId    = entries[0].id;
      const endId      = entries[entries.length - 1].id;

      // Level counts
      const counts = { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, CRITICAL: 0 };
      for (const e of entries) {
        const k = e.level.toUpperCase() as keyof typeof counts;
        if (k in counts) counts[k]++;
      }
      const maxSeverity = Math.max(...entries.map(e => LEVEL_INT[e.level.toUpperCase()] ?? 1));

      const batchMeta: BatchRow = {
        merkleRoot,
        startId,
        endId,
        logCount: entries.length,
        debugCount: counts.DEBUG,
        infoCount: counts.INFO,
        warnCount: counts.WARN,
        errorCount: counts.ERROR,
        criticalCount: counts.CRITICAL,
        maxSeverity,
        anchorStatus: 'pending',
        createdAt: new Date(),
      };

      await this.db.insertBatchRecord(batchMeta, this.batchesTable);
      await this.db.linkBatchLeaves(entries.map(e => e.id), merkleRoot, this.logTable);
      const tDbDone = Date.now();

      let txId: string | undefined;
      let confirmed: boolean | undefined;
      let anchorSuccess = true;

      if (this.anchor.writeBatch) {
        const anchorResult = await this.anchor.writeBatch(entries, opts);
        txId = anchorResult.txId;
        confirmed = anchorResult.confirmed;
        anchorSuccess = anchorResult.success;
      } else {
        const syntheticEntry = new LogEntry({
          level: entries[0].level,
          source: 'hybrid-batch',
          message: `batch:${entries.length}:${startId}:${endId}`,
          dataHash: merkleRoot,
        });
        const anchorResult = await this.anchor.writeLog(syntheticEntry, opts);
        txId = anchorResult.txId;
        confirmed = anchorResult.confirmed;
        anchorSuccess = anchorResult.success;
      }
      const submitDelay = Date.now() - tDbDone;
      // One submit covers the whole batch — attribute its delay to every leaf
      // so the per-entry average remains comparable to single-anchor mode.
      for (let i = 0; i < entries.length; i++) this.anchoringDelays.push(submitDelay);

      // Update batch anchor status
      const status = confirmed ? 'confirmed' : anchorSuccess ? 'pending' : 'failed';
      const anchAt = confirmed ? new Date() : undefined;
      await this.db.updateBatchAnchorStatus(merkleRoot, status, txId, undefined, anchAt, this.batchesTable);

      return {
        batchHash: merkleRoot,
        startId,
        endId,
        count: entries.length,
        success: anchorSuccess,
        latencyMs: Date.now() - start,
        txId,
        confirmed,
      };
    } catch (err) {
      return {
        batchHash: '',
        startId: entries[0]?.id ?? '',
        endId: entries[entries.length - 1]?.id ?? '',
        count: entries.length,
        success: false,
        latencyMs: Date.now() - start,
        error: String(err),
      };
    }
  }

  // ── verifyLog ────────────────────────────────────────────────────────────────

  async verifyLog(id: string): Promise<VerifyResult> {
    const start = Date.now();
    const row = await this.db.findAnchoredById(id, this.logTable);
    if (!row) {
      return { logId: id, valid: false, details: 'Not found in anchored table', verificationTimeMs: Date.now() - start };
    }
    // Rebuild a LogEntry to recompute hash
    const entry = new LogEntry({
      id: row.id,
      timestamp: row.timestamp,
      level: row.level,
      source: row.source,
      message: row.message,
      metadata: row.metadata,
    });
    const recomputed = HashService.computeLogHash(entry);
    const valid = recomputed === row.contentHash;
    return {
      logId: id,
      valid,
      details: valid
        ? `Hash verified (anchor: ${row.anchorStatus})`
        : 'Hash mismatch — record may be tampered',
      verificationTimeMs: Date.now() - start,
    };
  }

  // ── readLog ──────────────────────────────────────────────────────────────────

  async readLog(id: string): Promise<LogEntry | null> {
    const row = await this.db.findAnchoredById(id, this.logTable);
    if (!row) return null;
    return new LogEntry({
      id: row.id,
      timestamp: row.timestamp,
      level: row.level,
      source: row.source,
      message: row.message,
      metadata: row.metadata,
    });
  }

  async close(): Promise<void> {
    await this.db.close();
  }

  getAvgConfirmationTimeMs(): number {
    return isMetricsProvider(this.anchor) ? this.anchor.getAvgConfirmationTimeMs() : 0;
  }

  getAvgAnchoringDelayMs(): number {
    if (this.anchoringDelays.length === 0) return 0;
    return this.anchoringDelays.reduce((a, b) => a + b, 0) / this.anchoringDelays.length;
  }

  resetMetrics(): void {
    this.anchoringDelays.length = 0;
    const a = this.anchor as { resetMetrics?: () => void };
    a.resetMetrics?.();
  }
}

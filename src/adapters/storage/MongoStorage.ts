import { MongoAdapter } from '../../infrastructure/database/MongoAdapter';
import { LogStorage, WriteResult, VerifyResult, WriteOpts } from '../../core/LogStorage';
import { LogEntry } from '../../core/LogEntry';
import { HashService } from '../../core/HashService';

export class MongoStorage implements LogStorage {
  readonly name = 'MongoDB';
  readonly adapter: MongoAdapter;

  constructor(adapter?: MongoAdapter) {
    this.adapter = adapter ?? new MongoAdapter();
  }

  async initialize(): Promise<void> {
    return this.adapter.initialize();
  }

  async writeLog(entry: LogEntry, _opts?: WriteOpts): Promise<WriteResult> {
    const start = Date.now();
    try {
      if (!entry.dataHash) entry.dataHash = HashService.computeLogHash(entry);
      await this.adapter.insertOffchain(entry);
      return { logId: entry.id, success: true, latencyMs: Date.now() - start };
    } catch (err) {
      return { logId: entry.id, success: false, latencyMs: Date.now() - start, error: String(err) };
    }
  }

  async verifyLog(id: string): Promise<VerifyResult> {
    const start = Date.now();
    const log = await this.readLog(id);
    if (!log) {
      return { logId: id, valid: false, details: 'Not found', verificationTimeMs: Date.now() - start };
    }
    const recomputed = HashService.computeLogHash(log);
    const valid = log.dataHash ? recomputed === log.dataHash : true;
    return {
      logId: id,
      valid,
      details: valid ? 'Hash verified' : 'Hash mismatch — record may be tampered',
      verificationTimeMs: Date.now() - start,
    };
  }

  async readLog(id: string): Promise<LogEntry | null> {
    return this.adapter.findOffchainById(id);
  }

  async readLogs(
    opts: { limit?: number; offset?: number; level?: string; source?: string } = {},
  ): Promise<{ logs: LogEntry[]; total: number }> {
    const { rows, total } = await this.adapter.listOffchain(opts);
    return { logs: rows, total };
  }

  async close(): Promise<void> {
    return this.adapter.close();
  }
}

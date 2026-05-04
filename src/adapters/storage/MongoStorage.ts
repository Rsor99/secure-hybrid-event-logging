import { MongoAdapter } from '../../infrastructure/database/MongoAdapter';
import { LogStorage, WriteResult, VerifyResult } from '../../core/LogStorage';
import { LogEntry } from '../../core/LogEntry';
import { HashService } from '../../core/HashService';

export class MongoStorage implements LogStorage {
  private readonly adapter: MongoAdapter;
  readonly name = 'MongoDB';

  constructor() {
    this.adapter = new MongoAdapter();
  }

  async initialize(): Promise<void> {
    return this.adapter.initialize();
  }

  async writeLog(entry: LogEntry): Promise<WriteResult> {
    const start = Date.now();
    try {
      if (!entry.dataHash) entry.dataHash = HashService.computeLogHash(entry);
      await this.adapter.insert(entry);
      return { logId: entry.id, success: true, latencyMs: Date.now() - start };
    } catch (err) {
      return { logId: entry.id, success: false, latencyMs: Date.now() - start, error: String(err) };
    }
  }

  async verifyLog(id: string): Promise<VerifyResult> {
    const start = Date.now();
    const log = await this.adapter.findById(id);
    if (!log) return { logId: id, valid: false, details: 'Not found', verificationTimeMs: Date.now() - start };
    const valid = HashService.verifyLogHash(log);
    return {
      logId: id,
      valid,
      details: valid ? 'Hash verified' : 'Hash mismatch — record may be tampered',
      verificationTimeMs: Date.now() - start,
    };
  }

  async readLog(id: string): Promise<LogEntry | null> {
    return this.adapter.findById(id);
  }

  async close(): Promise<void> {
    return this.adapter.close();
  }
}

import { LogStorage, WriteResult } from '../core/LogStorage';
import { LogEntry } from '../core/LogEntry';

export class SyncWriter {
  constructor(private readonly storage: LogStorage) {}

  async write(entry: LogEntry): Promise<WriteResult> {
    const start = Date.now();
    const result = await this.storage.writeLog(entry);
    return { ...result, latencyMs: Date.now() - start };
  }
}

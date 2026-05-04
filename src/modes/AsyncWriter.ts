import { LogStorage, WriteResult } from '../core/LogStorage';
import { LogEntry } from '../core/LogEntry';

export class AsyncWriter {
  constructor(private readonly storage: LogStorage) {}

  write(entry: LogEntry): WriteResult {
    const start = Date.now();
    this.storage.writeLog(entry).catch(() => {});
    return { logId: entry.id, success: true, latencyMs: Date.now() - start };
  }
}

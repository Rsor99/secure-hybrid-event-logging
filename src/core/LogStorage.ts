import { LogEntry } from './LogEntry';

export interface WriteResult {
  logId: string;
  success: boolean;
  latencyMs: number;
  txId?: string;
  confirmed?: boolean;
  error?: string;
}

export interface VerifyResult {
  logId: string;
  valid: boolean;
  details: string;
  verificationTimeMs: number;
}

export interface BatchWriteResult {
  batchHash: string;
  startId: string;
  endId: string;
  count: number;
  success: boolean;
  latencyMs: number;
  txId?: string;
  confirmed?: boolean;
  error?: string;
}

export interface WriteOpts {
  // If false, anchor adapters submit the tx and return immediately without waiting
  // for confirmation. Default true (block until confirmed). Used by the queue
  // subscriber to enable a separate confirm queue.
  waitForConfirmation?: boolean;
}

export interface LogStorage {
  readonly name: string;
  initialize?(): Promise<void>;
  writeLog(entry: LogEntry, opts?: WriteOpts): Promise<WriteResult>;
  writeBatch?(entries: LogEntry[], opts?: WriteOpts): Promise<BatchWriteResult>;
  verifyLog(id: string): Promise<VerifyResult>;
  readLog(id: string): Promise<LogEntry | null>;
  close?(): Promise<void>;
}

export interface MetricsProvider {
  getAvgConfirmationTimeMs(): number;
}

export function isMetricsProvider(v: unknown): v is MetricsProvider {
  return typeof (v as MetricsProvider).getAvgConfirmationTimeMs === 'function';
}

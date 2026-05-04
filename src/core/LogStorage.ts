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

export interface LogStorage {
  readonly name: string;
  initialize?(): Promise<void>;
  writeLog(entry: LogEntry): Promise<WriteResult>;
  writeBatch?(entries: LogEntry[]): Promise<BatchWriteResult>;
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

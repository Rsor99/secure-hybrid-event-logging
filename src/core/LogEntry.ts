import { v4 as uuidv4 } from 'uuid';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface LogEntryData {
  id?: string;
  timestamp?: Date;
  level: LogLevel;
  source: string;
  message: string;
  metadata?: Record<string, unknown>;
  dataHash?: string;
  blockchainTxId?: string;
  blockchainConfirmed?: boolean;
}

export class LogEntry {
  public readonly id: string;
  public readonly timestamp: Date;
  public readonly level: LogLevel;
  public readonly source: string;
  public readonly message: string;
  public readonly metadata: Record<string, unknown>;
  public dataHash: string;
  public blockchainTxId: string | null;
  public blockchainConfirmed: boolean;

  constructor(data: LogEntryData) {
    this.id = data.id ?? uuidv4();
    this.timestamp = data.timestamp ?? new Date();
    this.level = data.level;
    this.source = data.source;
    this.message = data.message;
    this.metadata = data.metadata ?? {};
    this.dataHash = data.dataHash ?? '';
    this.blockchainTxId = data.blockchainTxId ?? null;
    this.blockchainConfirmed = data.blockchainConfirmed ?? false;
  }

  toHashableString(): string {
    return JSON.stringify({
      id: this.id,
      timestamp: this.timestamp.toISOString(),
      level: this.level,
      source: this.source,
      message: this.message,
      metadata: this.metadata,
    });
  }

  toPlainObject(): Record<string, unknown> {
    return {
      id: this.id,
      timestamp: this.timestamp.toISOString(),
      level: this.level,
      source: this.source,
      message: this.message,
      metadata: this.metadata,
      dataHash: this.dataHash,
      blockchainTxId: this.blockchainTxId,
      blockchainConfirmed: this.blockchainConfirmed,
    };
  }
}

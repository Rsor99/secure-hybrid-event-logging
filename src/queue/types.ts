export interface EntryDTO {
  id: string;
  timestampMs: number;
  level: string;
  source: string;
  message: string;
  metadata: Record<string, unknown>;
  dataHash: string;
}

export interface SubmitMessage {
  entry: EntryDTO;
  strategy: string;
  db: 'postgres' | 'mongo';
  correlationId: string;
  replyTo?: string;
  enqueuedAt: number;
}

export interface BatchSubmitMessage {
  entries: EntryDTO[];
  strategy: string;
  db: 'postgres' | 'mongo';
  correlationId: string;
  replyTo?: string;
  enqueuedAt: number;
}

export interface ConfirmMessage {
  logId: string;
  txHash: string;
  strategy: string;
  chain: 'exonum' | 'ethereum';
  db: 'postgres' | 'mongo';
  dbTable: string;
  batchesTable?: string;
  correlationId: string;
  replyTo?: string;
  enqueuedAt: number;
}

export interface ResultMessage {
  correlationId: string;
  success: boolean;
  publishLatencyMs: number;
  processLatencyMs: number;
  totalLatencyMs: number;
  txHash?: string;
  error?: string;
}

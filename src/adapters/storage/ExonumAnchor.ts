import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import { LogStorage, WriteResult, VerifyResult, BatchWriteResult, MetricsProvider, WriteOpts } from '../../core/LogStorage';
import { LogEntry, LogLevel } from '../../core/LogEntry';
import { HashService } from '../../core/HashService';
import { config } from '../../infrastructure/config/env';

const PKCS8_ED25519_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');

export type AnchorMode = 'full' | 'hash-only' | 'batch';

// ── minimal protobuf3 encoder ─────────────────────────────────────────────────

function varint(n: number): Buffer {
  const bytes: number[] = [];
  while (n > 127) { bytes.push((n & 0x7f) | 0x80); n = Math.floor(n / 128); }
  bytes.push(n & 0x7f);
  return Buffer.from(bytes);
}

function pbField(num: number, wtype: 0 | 2, value: Buffer | number): Buffer {
  const tag = (num << 3) | wtype;
  if (wtype === 0) return Buffer.concat([varint(tag), varint(value as number)]);
  const buf = value as Buffer;
  return Buffer.concat([varint(tag), varint(buf.length), buf]);
}

// LogService method 0 — WriteLog fields 1-7
function encodeWriteLog(data: {
  content_hash: string; level: string; source: string;
  message_preview: string; seed: number; message: string; metadata_json: string;
}): Buffer {
  const u = (s: string) => Buffer.from(s, 'utf8');
  const parts: Buffer[] = [pbField(1, 2, u(data.content_hash))];
  if (data.level)           parts.push(pbField(2, 2, u(data.level)));
  if (data.source)          parts.push(pbField(3, 2, u(data.source)));
  if (data.message_preview) parts.push(pbField(4, 2, u(data.message_preview)));
  if (data.seed)            parts.push(pbField(5, 0, data.seed));
  if (data.message)         parts.push(pbField(6, 2, u(data.message)));
  if (data.metadata_json)   parts.push(pbField(7, 2, u(data.metadata_json)));
  return Buffer.concat(parts);
}

// HashService method 0 — WriteHash fields 1-4
function encodeWriteHash(data: {
  content_hash: string; level: string;
  message_preview: string; seed: number;
}): Buffer {
  const u = (s: string) => Buffer.from(s, 'utf8');
  const parts: Buffer[] = [pbField(1, 2, u(data.content_hash))];
  if (data.level)           parts.push(pbField(2, 2, u(data.level)));
  if (data.message_preview) parts.push(pbField(3, 2, u(data.message_preview)));
  if (data.seed)            parts.push(pbField(4, 0, data.seed));
  return Buffer.concat(parts);
}

// BatchService method 0 — WriteBatch fields 1-11
function encodeWriteBatch(data: {
  content_hash: string; seed: number;
  start_id: string; end_id: string; count: number;
  debug_count: number; info_count: number; warn_count: number;
  error_count: number; critical_count: number; max_severity: string;
}): Buffer {
  const u = (s: string) => Buffer.from(s, 'utf8');
  const parts: Buffer[] = [pbField(1, 2, u(data.content_hash))];
  if (data.seed)          parts.push(pbField(2, 0, data.seed));
  if (data.start_id)      parts.push(pbField(3, 2, u(data.start_id)));
  if (data.end_id)        parts.push(pbField(4, 2, u(data.end_id)));
  if (data.count)         parts.push(pbField(5, 0, data.count));
  if (data.debug_count)   parts.push(pbField(6, 0, data.debug_count));
  if (data.info_count)    parts.push(pbField(7, 0, data.info_count));
  if (data.warn_count)    parts.push(pbField(8, 0, data.warn_count));
  if (data.error_count)   parts.push(pbField(9, 0, data.error_count));
  if (data.critical_count) parts.push(pbField(10, 0, data.critical_count));
  if (data.max_severity)  parts.push(pbField(11, 2, u(data.max_severity)));
  return Buffer.concat(parts);
}

function encodeAnyTx(instanceId: number, methodId: number, args: Buffer): Buffer {
  const callInfoParts: Buffer[] = [pbField(1, 0, instanceId)];
  if (methodId !== 0) callInfoParts.push(pbField(2, 0, methodId));
  const callInfo = Buffer.concat(callInfoParts);
  return Buffer.concat([pbField(1, 2, callInfo), pbField(2, 2, args)]);
}

function encodeCoreMessage(anyTxBytes: Buffer): Buffer {
  return pbField(1, 2, anyTxBytes);
}

function encodeSignedMessage(payload: Buffer, pubkeyHex: string, sig: Buffer): Buffer {
  const author    = pbField(1, 2, Buffer.from(pubkeyHex, 'hex'));
  const signature = pbField(1, 2, sig);
  return Buffer.concat([pbField(1, 2, payload), pbField(2, 2, author), pbField(3, 2, signature)]);
}

// ── per-mode service config ───────────────────────────────────────────────────

function serviceConfig(mode: AnchorMode) {
  if (mode === 'full')      return { id: config.exonum.logServiceId,   name: config.exonum.logServiceName };
  if (mode === 'hash-only') return { id: config.exonum.hashServiceId,  name: config.exonum.hashServiceName };
                             return { id: config.exonum.batchServiceId, name: config.exonum.batchServiceName };
}

// ── anchor class ──────────────────────────────────────────────────────────────

export class ExonumAnchor implements LogStorage, MetricsProvider {
  readonly name: string;

  private readonly client:            AxiosInstance;
  private readonly hashRegistry     = new Map<string, string>();
  private readonly entryRegistry    = new Map<string, LogEntry>();
  private readonly confirmationTimes: number[] = [];
  private readonly svcId:             number;
  private readonly svcName:           string;

  constructor(private readonly anchorMode: AnchorMode = 'full') {
    const svc = serviceConfig(anchorMode);
    this.svcId   = svc.id;
    this.svcName = svc.name;
    this.name    = anchorMode === 'full'      ? 'Exonum(log)'
                 : anchorMode === 'hash-only' ? 'Exonum(hash)'
                 :                              'Exonum(batch)';
    this.client  = axios.create({ baseURL: config.exonum.nodeUrl, timeout: 30000 });
  }

  async writeLog(entry: LogEntry, opts?: WriteOpts): Promise<WriteResult> {
    const start = Date.now();
    try {
      const hash = entry.dataHash || HashService.computeLogHash(entry);
      entry.dataHash = hash;
      this.hashRegistry.set(entry.id, hash);
      this.entryRegistry.set(entry.id, entry);

      const preview = entry.message.slice(0, 256);
      const seed    = Date.now() & 0x7fffffff;
      let txBytes: Buffer;

      if (this.anchorMode === 'full') {
        txBytes = encodeWriteLog({
          content_hash: hash, level: entry.level, source: entry.source,
          message_preview: preview, seed,
          message: entry.message, metadata_json: JSON.stringify(entry.metadata ?? {}),
        });
      } else {
        txBytes = encodeWriteHash({ content_hash: hash, level: entry.level, message_preview: preview, seed });
      }

      const { txHash, submitLatency } = await this.submitTxBytes(txBytes, 0);
      entry.blockchainTxId = txHash;

      if (opts?.waitForConfirmation === false) {
        entry.blockchainConfirmed = false;
        return { logId: entry.id, success: true, latencyMs: Date.now() - start, txId: txHash, confirmed: false };
      }

      const { confirmed } = await this.waitForConfirmation(txHash);
      const totalLatency = Date.now() - start;
      this.confirmationTimes.push(totalLatency - submitLatency);
      entry.blockchainConfirmed = confirmed;
      return { logId: entry.id, success: true, latencyMs: totalLatency, txId: txHash, confirmed };
    } catch (err) {
      return { logId: entry.id, success: false, latencyMs: Date.now() - start, error: String(err) };
    }
  }

  async writeBatch(entries: LogEntry[], opts?: WriteOpts): Promise<BatchWriteResult> {
    if (entries.length === 0) {
      return { batchHash: '', startId: '', endId: '', count: 0, success: false, latencyMs: 0, error: 'Empty batch' };
    }
    const start = Date.now();
    try {
      for (const e of entries) {
        if (!e.dataHash) e.dataHash = HashService.computeLogHash(e);
      }
      const contentHash = HashService.computeBatchHash(entries);
      const startId     = entries[0].id;
      const endId       = entries[entries.length - 1].id;
      const seed        = Date.now() & 0x7fffffff;

      const levelCounts = { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, CRITICAL: 0 };
      for (const e of entries) {
        const k = e.level.toUpperCase() as keyof typeof levelCounts;
        if (k in levelCounts) levelCounts[k]++;
      }
      const severityOrder = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];
      const maxSeverity = severityOrder.reduce((max, s) =>
        levelCounts[s as keyof typeof levelCounts] > 0 ? s : max, 'DEBUG');

      let txBytes: Buffer;

      if (this.anchorMode === 'batch') {
        txBytes = encodeWriteBatch({
          content_hash:   contentHash,
          seed,
          start_id:       startId,
          end_id:         endId,
          count:          entries.length,
          debug_count:    levelCounts.DEBUG,
          info_count:     levelCounts.INFO,
          warn_count:     levelCounts.WARN,
          error_count:    levelCounts.ERROR,
          critical_count: levelCounts.CRITICAL,
          max_severity:   maxSeverity,
        });
      } else if (this.anchorMode === 'full') {
        const preview = `batch:${entries.length}:${startId.slice(0, 8)}..${endId.slice(0, 8)}`;
        txBytes = encodeWriteLog({
          content_hash: contentHash, level: maxSeverity, source: entries[0].source,
          message_preview: preview, seed, message: preview, metadata_json: '{}',
        });
      } else {
        const preview = `batch:${entries.length}:${startId.slice(0, 8)}..${endId.slice(0, 8)}`;
        txBytes = encodeWriteHash({ content_hash: contentHash, level: maxSeverity, message_preview: preview, seed });
      }

      const { txHash, submitLatency } = await this.submitTxBytes(txBytes, 0);
      for (const e of entries) {
        e.blockchainTxId = txHash;
        this.hashRegistry.set(e.id, contentHash);
      }

      if (opts?.waitForConfirmation === false) {
        for (const e of entries) e.blockchainConfirmed = false;
        return { batchHash: contentHash, startId, endId, count: entries.length, success: true, latencyMs: Date.now() - start, txId: txHash, confirmed: false };
      }

      const { confirmed } = await this.waitForConfirmation(txHash);
      const totalLatency = Date.now() - start;
      this.confirmationTimes.push(totalLatency - submitLatency);
      for (const e of entries) e.blockchainConfirmed = confirmed;
      return { batchHash: contentHash, startId, endId, count: entries.length, success: true, latencyMs: totalLatency, txId: txHash, confirmed };
    } catch (err) {
      return { batchHash: '', startId: '', endId: '', count: entries.length, success: false, latencyMs: Date.now() - start, error: String(err) };
    }
  }

  async verifyLog(id: string): Promise<VerifyResult> {
    const start = Date.now();
    const hash = this.hashRegistry.get(id);
    if (!hash) return { logId: id, valid: false, details: 'Hash not in registry', verificationTimeMs: Date.now() - start };
    try {
      const endpoint = this.anchorMode === 'full'
        ? `/api/services/${this.svcName}/v1/logs/info`
        : this.anchorMode === 'batch'
        ? `/api/services/${this.svcName}/v1/batches/info`
        : `/api/services/${this.svcName}/v1/hashes/info`;
      const response = await this.client.get(endpoint, { params: { hash } });
      const record   = response.data?.record;
      const valid    = response.status === 200 && record?.content_hash === hash;
      return { logId: id, valid, details: valid ? 'Hash found on chain' : 'Hash not on chain', verificationTimeMs: Date.now() - start };
    } catch {
      return { logId: id, valid: false, details: 'Verification request failed', verificationTimeMs: Date.now() - start };
    }
  }

  async readLog(id: string): Promise<LogEntry | null> {
    const cached = this.entryRegistry.get(id);
    if (cached) return cached;
    if (this.anchorMode !== 'full') return null;
    const hash = this.hashRegistry.get(id);
    if (!hash) return null;
    try {
      const response = await this.client.get(`/api/services/${this.svcName}/v1/logs/info`, { params: { hash } });
      const record = response.data?.record;
      if (!record) return null;
      const levelRaw = String(record.level ?? 'INFO');
      const level = (Object.values(LogLevel).includes(levelRaw as LogLevel) ? levelRaw : LogLevel.INFO) as LogLevel;
      return new LogEntry({ id, level, source: String(record.source ?? 'exonum'), message: String(record.message ?? record.message_preview ?? ''), metadata: record.metadata_json ? JSON.parse(record.metadata_json) : {}, dataHash: hash, blockchainConfirmed: true });
    } catch { return null; }
  }

  getAvgConfirmationTimeMs(): number {
    if (this.confirmationTimes.length === 0) return 0;
    return this.confirmationTimes.reduce((a, b) => a + b, 0) / this.confirmationTimes.length;
  }

  // Used by the queue confirm handler to backfill confirmation timing
  // for the wait=false path (where writeLog returns before confirmation).
  recordConfirmationTime(ms: number): void {
    if (ms >= 0) this.confirmationTimes.push(ms);
  }

  // Called between benchmark cells so each cell's avg metric reflects only
  // that cell's writes, not the running average across all prior cells.
  resetMetrics(): void {
    this.confirmationTimes.length = 0;
  }

  private async submitTxBytes(txArgBytes: Buffer, methodId: number): Promise<{ txHash: string; submitLatency: number }> {
    const start       = Date.now();
    const anyTxBytes  = encodeAnyTx(this.svcId, methodId, txArgBytes);
    const coreMessage = encodeCoreMessage(anyTxBytes);
    const seedBytes   = Buffer.from(config.exonum.secretKey, 'hex').subarray(0, 32);
    const privateKey  = crypto.createPrivateKey({ key: Buffer.concat([PKCS8_ED25519_PREFIX, seedBytes]), format: 'der', type: 'pkcs8' });
    const sig         = crypto.sign(null, coreMessage, privateKey);
    const txBody      = encodeSignedMessage(coreMessage, config.exonum.publicKey, sig).toString('hex');
    const res         = await this.client.post('/api/explorer/v1/transactions', { tx_body: txBody });
    return { txHash: res.data.tx_hash as string, submitLatency: Date.now() - start };
  }

  // Single-shot tri-state check used by the confirm queue.
  async checkTx(txHash: string): Promise<{ confirmed: boolean; pending: boolean }> {
    try {
      const res = await this.client.get(`/api/explorer/v1/transactions?hash=${txHash}`);
      const type = res.data?.type;
      if (type === 'committed') return { confirmed: true, pending: false };
      if (type === 'in-pool')   return { confirmed: false, pending: true };
      // Anything else (e.g. unknown) — treat as failed/dropped
      return { confirmed: false, pending: false };
    } catch {
      // 404 / network — tx may not yet be indexed by this node
      return { confirmed: false, pending: true };
    }
  }

  private async waitForConfirmation(txHash: string): Promise<{ confirmed: boolean }> {
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
      const { confirmed, pending } = await this.checkTx(txHash);
      if (confirmed) return { confirmed: true };
      if (!pending)  return { confirmed: false };
    }
    return { confirmed: false };
  }
}

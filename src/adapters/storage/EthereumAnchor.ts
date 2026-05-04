import { ethers } from 'ethers';
import { LogStorage, WriteResult, VerifyResult, BatchWriteResult, MetricsProvider } from '../../core/LogStorage';
import { LogEntry, LogLevel } from '../../core/LogEntry';
import { HashService } from '../../core/HashService';
import { config } from '../../infrastructure/config/env';

// ── ABIs ──────────────────────────────────────────────────────────────────────

const LOGSTORE_ABI = [
  'function write(bytes32 contentHash, uint8 level, bytes32 source, string calldata messagePreview, string calldata message, string calldata metadataJson) external',
  'function exists(bytes32 contentHash) external view returns (bool)',
  'function getRecord(bytes32 contentHash) external view returns (tuple(uint8 level, bytes32 source, string messagePreview, uint256 historyLen, bytes32 historyHash, string message, string metadataJson, uint256 timestamp, uint256 blockNumber, address submitter))',
  'event LogWritten(bytes32 indexed contentHash, address indexed submitter, uint8 level, bytes32 source)',
];

const HASHSTORE_ABI = [
  'function write(bytes32 contentHash, uint8 level, string calldata messagePreview) external',
  'function exists(bytes32 contentHash) external view returns (bool)',
  'event HashWritten(bytes32 indexed contentHash, address indexed submitter, uint8 level)',
];

const BATCHSTORE_ABI = [
  'function write(bytes32 merkleRoot, string calldata startId, string calldata endId, uint32 count, uint32 debugCount, uint32 infoCount, uint32 warnCount, uint32 errorCount, uint32 criticalCount, uint8 maxSeverity) external',
  'function exists(bytes32 merkleRoot) external view returns (bool)',
  'event BatchWritten(bytes32 indexed merkleRoot, address indexed submitter, uint32 count, uint8 maxSeverity)',
];

// ── level helpers ─────────────────────────────────────────────────────────────

const LEVEL_TO_UINT8: Record<string, number> = {
  DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, CRITICAL: 4,
};

function levelUint8(level: string): number {
  return LEVEL_TO_UINT8[level.toUpperCase()] ?? 1;
}

function sourceBytes32(source: string): string {
  const truncated = source.slice(0, 31);
  return ethers.encodeBytes32String(truncated);
}

// ── anchor class ──────────────────────────────────────────────────────────────

export type AnchorMode = 'full' | 'hash-only' | 'batch';

export class EthereumAnchor implements LogStorage, MetricsProvider {
  readonly name: string;

  private readonly provider:  ethers.JsonRpcProvider;
  private readonly wallet:    ethers.Wallet;
  private readonly contract:  ethers.Contract;
  private readonly hashRegistry  = new Map<string, string>();
  private readonly entryRegistry = new Map<string, LogEntry>();
  private readonly latencies:          number[] = [];
  private readonly confirmationTimes:  number[] = [];

  constructor(private readonly anchorMode: AnchorMode = 'full') {
    this.provider = new ethers.JsonRpcProvider(config.ethereum.rpcUrl);
    this.wallet   = new ethers.Wallet(config.ethereum.privateKey, this.provider);

    if (anchorMode === 'full') {
      this.name     = 'Ethereum(LogStore)';
      this.contract = new ethers.Contract(config.ethereum.logContract, LOGSTORE_ABI, this.wallet);
    } else if (anchorMode === 'hash-only') {
      this.name     = 'Ethereum(HashStore)';
      this.contract = new ethers.Contract(config.ethereum.hashContract, HASHSTORE_ABI, this.wallet);
    } else {
      this.name     = 'Ethereum(BatchStore)';
      this.contract = new ethers.Contract(config.ethereum.batchContract, BATCHSTORE_ABI, this.wallet);
    }
  }

  async writeLog(entry: LogEntry): Promise<WriteResult> {
    const start = Date.now();
    try {
      const hash = entry.dataHash || HashService.computeLogHash(entry);
      entry.dataHash = hash;
      this.hashRegistry.set(entry.id, hash);
      this.entryRegistry.set(entry.id, entry);

      const bytes32Hash = this.toBytes32(hash);
      const level       = levelUint8(entry.level);
      const preview     = entry.message.slice(0, 256);

      let tx;
      if (this.anchorMode === 'full') {
        tx = await this.contract.write(
          bytes32Hash,
          level,
          sourceBytes32(entry.source),
          preview,
          entry.message,
          JSON.stringify(entry.metadata ?? {}),
        );
      } else {
        tx = await this.contract.write(bytes32Hash, level, preview);
      }

      const submitLatency = Date.now() - start;
      const receipt       = await tx.wait(config.ethereum.confirmationBlocks);
      const totalLatency  = Date.now() - start;

      this.latencies.push(submitLatency);
      this.confirmationTimes.push(totalLatency - submitLatency);

      entry.blockchainTxId      = receipt.hash;
      entry.blockchainConfirmed = true;
      return { logId: entry.id, success: true, latencyMs: totalLatency, txId: receipt.hash, confirmed: true };
    } catch (err) {
      return { logId: entry.id, success: false, latencyMs: Date.now() - start, error: String(err) };
    }
  }

  async writeBatch(entries: LogEntry[]): Promise<BatchWriteResult> {
    if (entries.length === 0) {
      return { batchHash: '', startId: '', endId: '', count: 0, success: false, latencyMs: 0, error: 'Empty batch' };
    }
    const start = Date.now();
    try {
      for (const e of entries) {
        if (!e.dataHash) e.dataHash = HashService.computeLogHash(e);
      }
      const merkleRoot = HashService.computeBatchHash(entries);
      const startId    = entries[0].id;
      const endId      = entries[entries.length - 1].id;

      const levelCounts = { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, CRITICAL: 0 };
      for (const e of entries) {
        const k = e.level.toUpperCase() as keyof typeof levelCounts;
        if (k in levelCounts) levelCounts[k]++;
      }
      const severityOrder = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];
      const maxSeverityStr = severityOrder.reduce((max, s) =>
        levelCounts[s as keyof typeof levelCounts] > 0 ? s : max, 'DEBUG');
      const maxSeverity = levelUint8(maxSeverityStr);

      const bytes32Root = this.toBytes32(merkleRoot);
      let tx;

      if (this.anchorMode === 'batch') {
        tx = await this.contract.write(
          bytes32Root,
          startId, endId,
          entries.length,
          levelCounts.DEBUG, levelCounts.INFO, levelCounts.WARN, levelCounts.ERROR, levelCounts.CRITICAL,
          maxSeverity,
        );
      } else if (this.anchorMode === 'full') {
        tx = await this.contract.write(
          bytes32Root,
          levelUint8(maxSeverityStr),
          sourceBytes32(entries[0].source),
          `batch:${entries.length}`,
          `batch:${entries.length}:${startId.slice(0, 8)}..${endId.slice(0, 8)}`,
          '{}',
        );
      } else {
        tx = await this.contract.write(bytes32Root, levelUint8(maxSeverityStr), `batch:${entries.length}`);
      }

      const submitLatency = Date.now() - start;
      const receipt       = await tx.wait(config.ethereum.confirmationBlocks);
      const totalLatency  = Date.now() - start;

      this.latencies.push(submitLatency);
      this.confirmationTimes.push(totalLatency - submitLatency);

      for (const e of entries) {
        e.blockchainTxId      = receipt.hash;
        e.blockchainConfirmed = true;
        this.hashRegistry.set(e.id, merkleRoot);
      }

      return { batchHash: merkleRoot, startId, endId, count: entries.length, success: true, latencyMs: totalLatency, txId: receipt.hash, confirmed: true };
    } catch (err) {
      return { batchHash: '', startId: '', endId: '', count: entries.length, success: false, latencyMs: Date.now() - start, error: String(err) };
    }
  }

  async verifyLog(id: string): Promise<VerifyResult> {
    const start = Date.now();
    const hash = this.hashRegistry.get(id);
    if (!hash) {
      return { logId: id, valid: false, details: 'Hash not in registry — write first', verificationTimeMs: Date.now() - start };
    }
    try {
      const valid: boolean = await this.contract.exists(this.toBytes32(hash));
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
      const filter = this.contract.filters.LogWritten(this.toBytes32(hash));
      const events = await this.contract.queryFilter(filter);
      if (events.length === 0) return null;

      const ev   = events[0] as ethers.EventLog;
      const args = ev.args as unknown as [string, string, number, string];
      const [, , levelUint] = args;

      const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];
      const levelStr   = levelNames[levelUint] ?? 'INFO';
      const level      = (Object.values(LogLevel).includes(levelStr as LogLevel) ? levelStr : LogLevel.INFO) as LogLevel;

      return new LogEntry({
        id,
        level,
        source:              'ethereum',
        message:             '',
        dataHash:            hash,
        blockchainTxId:      ev.transactionHash,
        blockchainConfirmed: true,
      });
    } catch {
      return null;
    }
  }

  getAvgConfirmationTimeMs(): number {
    if (this.confirmationTimes.length === 0) return 0;
    return this.confirmationTimes.reduce((a, b) => a + b, 0) / this.confirmationTimes.length;
  }

  private toBytes32(hash: string): string {
    const hex = hash.replace(/^0x/, '').padStart(64, '0');
    return '0x' + hex.slice(0, 64);
  }
}

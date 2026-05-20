import { v7 as uuidv7 } from 'uuid';
import { LogStorage, isMetricsProvider } from '../core/LogStorage';
import { LogEntry, LogLevel } from '../core/LogEntry';
import { WriteMode, LogStrategy } from '../core/LogMode';
import { SyncWriter } from '../modes/SyncWriter';
import { BatchWriter } from '../modes/BatchWriter';
import { RabbitMQClient } from '../queue/RabbitMQClient';
import { publishLog } from '../queue/publisher';
import { isChainStrategy } from '../queue/queues';
import { ResultMessage } from '../queue/types';
import {
  PostgresAdapter,
  TBL_OFFCHAIN,
  TBL_ANCHORED_PRIVATE,
  TBL_ANCHORED_PUBLIC,
  TBL_BATCHED_PRIVATE,
  TBL_BATCHED_PUBLIC,
  TBL_BATCHES_PRIVATE,
  TBL_BATCHES_PUBLIC,
} from '../infrastructure/database/PostgresAdapter';
import { MongoAdapter } from '../infrastructure/database/MongoAdapter';

interface AnchoringDelayProvider { getAvgAnchoringDelayMs(): number }
function hasAnchoringDelay(v: unknown): v is AnchoringDelayProvider {
  return typeof (v as AnchoringDelayProvider).getAvgAnchoringDelayMs === 'function';
}

function pickRandomIds(logs: LogEntry[], n: number): string[] {
  const pool = logs.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(n, pool.length)).map((l) => l.id);
}

// Tables touched by each strategy — used for storage-overhead and tamper sub-tests.
function tablesFor(strategy: LogStrategy): string[] {
  switch (strategy) {
    case LogStrategy.DATABASE_ONLY:        return [TBL_OFFCHAIN];
    case LogStrategy.HYBRID_PRIVATE:       return [TBL_ANCHORED_PRIVATE];
    case LogStrategy.HYBRID_PUBLIC:        return [TBL_ANCHORED_PUBLIC];
    case LogStrategy.HYBRID_PRIVATE_BATCH: return [TBL_BATCHED_PRIVATE, TBL_BATCHES_PRIVATE];
    case LogStrategy.HYBRID_PUBLIC_BATCH:  return [TBL_BATCHED_PUBLIC,  TBL_BATCHES_PUBLIC];
    default:                               return [];  // pure chain strategies don't use the DB
  }
}

// The leaf table — the one that holds the actual log content (for tamper / verify).
function leafTableFor(strategy: LogStrategy): string | null {
  const tables = tablesFor(strategy);
  return tables[0] ?? null;
}

export interface BenchmarkConfig {
  strategy: LogStrategy;
  mode: WriteMode;
  concurrency: number;
  totalWrites: number;
  batchSize: number;
  db?: 'postgres' | 'mongo';
  tamperPercent?: number;
}

export interface TamperedLog {
  id: string;
  beforeMessage: string;
  afterMessage:  string;
  tamperType:    'update' | 'not-applicable';
  detected:      boolean;
  verifyDetails: string;
}

export interface BenchmarkResult {
  strategy: string;
  mode: string;
  concurrency: number;
  totalWrites: number;
  successCount: number;
  failureCount: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  throughputPerSecond: number;
  totalDurationMs: number;
  blockchainConfirmationTimeMs: number;
  hashAnchoringDelayMs: number;
  integrityVerificationTimeMs: number;
  storageOverheadBytes: number;
  tamperPercent: number;
  tamperedSamples: number;
  detectedSamples: number;
  tamperDetectionRatePercent: number;
  tamperedLogs: TamperedLog[];
  integrityExposureWindowMs: number;
  cpuUsagePercent: number;
  memoryUsageMB: number;
  timestamp: string;
}

export class BenchmarkEngine {
  constructor(
    private readonly storages: Map<LogStrategy, LogStorage>,
    private readonly mqClient?: RabbitMQClient,
    private readonly pgAdapter?: PostgresAdapter,
    private readonly mongoAdapter?: MongoAdapter | null,
  ) {}

  async run(benchConfig: BenchmarkConfig): Promise<BenchmarkResult> {
    const storage = this.storages.get(benchConfig.strategy);
    if (!storage) {
      throw new Error(`No storage found for strategy: ${benchConfig.strategy}`);
    }

    // Anchor / hybrid instances are reused across cells in a single runner
    // process — clear their per-write metric arrays so this cell's averages
    // aren't polluted by prior cells.
    const s = storage as { resetMetrics?: () => void };
    s.resetMetrics?.();

    const logs = this.generateLogs(benchConfig.totalWrites);
    const latencies: number[] = [];
    let successCount = 0;
    let failureCount = 0;

    const cpuBefore = process.cpuUsage();
    const memBefore = process.memoryUsage();
    const startTime = Date.now();

    const useQueue = benchConfig.mode === WriteMode.ASYNC
      && isChainStrategy(benchConfig.strategy)
      && !!this.mqClient;

    if (useQueue) {
      // True async: publish all entries to queue with a temp reply-to queue,
      // then drain N ResultMessages to get real end-to-end latencies.
      const replyQueue = `results.${uuidv7()}`;
      await this.mqClient!.assertTempQueue(replyQueue);

      const collected: ResultMessage[] = [];
      let drainResolve!: () => void;
      const drainDone = new Promise<void>((resolve) => { drainResolve = resolve; });
      // Register the consumer BEFORE publishing to avoid a race where
      // the first reply could land before subscribe completes.
      await this.mqClient!.subscribe(replyQueue, async (msg, ack) => {
        const result = this.mqClient!.parseMessage<ResultMessage>(msg);
        collected.push(result);
        ack();
        if (collected.length >= logs.length) drainResolve();
      });

      const db = benchConfig.db ?? 'postgres';
      for (const entry of logs) {
        await publishLog(this.mqClient!, entry, benchConfig.strategy, db, replyQueue, entry.id);
      }

      const timeoutMs = logs.length * 30_000;
      await Promise.race([
        drainDone,
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error('queue drain timeout')), timeoutMs)),
      ]).catch((err) => console.warn('[BenchmarkEngine] queue drain:', err.message));

      for (const r of collected) {
        latencies.push(r.totalLatencyMs);
        if (r.success) successCount++;
        else failureCount++;
      }
      // Any messages we never got back count as failures
      failureCount += logs.length - collected.length;

    } else if (benchConfig.mode === WriteMode.BATCH) {
      // Each write() resolves when its enclosing flush finishes, so the per-entry
      // latency below is the real "wall-clock until persisted" — not amortized.
      const batchWriter = new BatchWriter(storage, benchConfig.batchSize);
      const writeStarts = logs.map(() => 0);
      const writes = logs.map((entry, i) => {
        writeStarts[i] = Date.now();
        return batchWriter.write(entry).then(
          (r) => {
            latencies.push(Date.now() - writeStarts[i]);
            if (r.success) successCount++;
            else failureCount++;
          },
          () => {
            latencies.push(Date.now() - writeStarts[i]);
            failureCount++;
          },
        );
      });
      await Promise.all(writes);
      // Force a flush of any tail entries (only matters if logs.length % batchSize !== 0).
      await batchWriter.flush();

    } else if (benchConfig.mode === WriteMode.ASYNC) {
      // db_only async: concurrent direct writes, no queue needed.
      // concurrency controls how many are in-flight at once.
      const semaphore = new Semaphore(benchConfig.concurrency);
      const promises = logs.map(async (entry) => {
        await semaphore.acquire();
        try {
          const writeStart = Date.now();
          const result = await storage.writeLog(entry);
          latencies.push(Date.now() - writeStart);
          if (result.success) successCount++;
          else failureCount++;
        } catch {
          failureCount++;
          latencies.push(Date.now() - startTime);
        } finally {
          semaphore.release();
        }
      });
      await Promise.all(promises);

    } else {
      // Sequential writes: concurrency=1 enforced regardless of the config value.
      const syncWriter = new SyncWriter(storage);
      const semaphore = new Semaphore(1);
      const promises = logs.map(async (entry) => {
        await semaphore.acquire();
        try {
          const writeStart = Date.now();
          const result = await syncWriter.write(entry);
          latencies.push(Date.now() - writeStart);
          if (result.success) successCount++;
          else failureCount++;
        } finally {
          semaphore.release();
        }
      });
      await Promise.all(promises);
    }

    const totalDurationMs = Date.now() - startTime;
    const cpuAfter = process.cpuUsage(cpuBefore);
    const memAfter = process.memoryUsage();
    const cpuPercent = ((cpuAfter.user + cpuAfter.system) / 1000 / totalDurationMs) * 100;
    const memUsageMB = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;

    const db: 'postgres' | 'mongo' = benchConfig.db ?? 'postgres';
    const adapter = db === 'mongo' ? this.mongoAdapter : this.pgAdapter;
    const tables  = tablesFor(benchConfig.strategy);
    const leaf    = leafTableFor(benchConfig.strategy);
    const isHybrid    = benchConfig.strategy.startsWith('hybrid');
    const isPureChain =
      benchConfig.strategy === LogStrategy.PRIVATE_CHAIN ||
      benchConfig.strategy === LogStrategy.PUBLIC_CHAIN;

    // Wait for the confirm queue to settle (up to 2 min) — async+chain rows
    // would otherwise still be in 'pending' and the exposure window unmeasurable.
    let exposureWindowMs = 0;
    if (adapter && leaf && isHybrid && successCount > 0) {
      const deadline = Date.now() + 120_000;
      while (Date.now() < deadline) {
        const stillPending = await adapter.countByStatus(leaf, 'pending');
        if (stillPending === 0) break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      exposureWindowMs = await adapter.avgExposureWindowMs(leaf);
    }

    // Storage overhead: query the tables this strategy actually wrote to.
    let storageBytes = 0;
    if (adapter) {
      for (const t of tables) storageBytes += await adapter.tableSizeBytes(t);
    }

    // Tamper sub-test — works for every strategy, but the mechanism differs:
    //   db_only  → UPDATE row; verify has no hash to compare → undetected (~0%)
    //   hybrid_* → UPDATE row; verify recomputes hash → mismatch → detected (~100%)
    //   pure chain → can't actually tamper (chain immutable); count as 100% by design
    const tamperPercent = Math.max(0, Math.min(100, benchConfig.tamperPercent ?? 10));
    const tamperedLogs: TamperedLog[] = [];
    let tamperedSamples = 0;
    let detectedSamples = 0;

    if (successCount > 0 && tamperPercent > 0) {
      const tamperCount = Math.max(1, Math.ceil(successCount * tamperPercent / 100));
      const sampleIds   = pickRandomIds(logs, tamperCount);

      for (const id of sampleIds) {
        const original = logs.find((l) => l.id === id);
        const beforeMessage = original?.message ?? '';

        if (isPureChain) {
          // Chain is immutable — there is no DB row to mutate. Record the cell
          // as "tamper not applicable" and credit it as detected (100% by design).
          tamperedLogs.push({
            id,
            beforeMessage,
            afterMessage:  beforeMessage,
            tamperType:    'not-applicable',
            detected:      true,
            verifyDetails: 'Chain is immutable — log content cannot be modified',
          });
          tamperedSamples++;
          detectedSamples++;
          continue;
        }

        const targetTable = leaf;
        if (!adapter || !targetTable) {
          // No way to physically tamper without a DB — skip silently.
          continue;
        }

        const afterMessage = `${beforeMessage} [tampered]`;
        await adapter.tamperLog(id, targetTable);

        const r = await storage.verifyLog(id);
        const detected = !r.valid;
        if (detected) detectedSamples++;
        tamperedSamples++;
        tamperedLogs.push({
          id,
          beforeMessage,
          afterMessage,
          tamperType: 'update',
          detected,
          verifyDetails: r.details,
        });
      }
    }

    // Verification-time sample — measure on IDs that were NOT tampered above.
    let verificationTime = 0;
    if (successCount > 0 && logs.length > 0) {
      const tamperedIds = new Set(tamperedLogs.map((t) => t.id));
      const cleanLogs   = logs.filter((l) => !tamperedIds.has(l.id));
      const pool        = cleanLogs.length > 0 ? cleanLogs : logs;
      const verifyCount = Math.min(10, pool.length);
      const verifyIds   = pool.slice(0, verifyCount).map((l) => l.id);
      const times: number[] = [];
      for (const id of verifyIds) {
        const t0 = Date.now();
        await storage.verifyLog(id);
        times.push(Date.now() - t0);
      }
      verificationTime = times.reduce((a, b) => a + b, 0) / times.length;
    }

    const confirmationTime = isMetricsProvider(storage) ? storage.getAvgConfirmationTimeMs() : 0;
    const anchoringDelayMs = hasAnchoringDelay(storage) ? storage.getAvgAnchoringDelayMs() : 0;
    const tamperRate = tamperedSamples > 0 ? (detectedSamples / tamperedSamples) * 100 : 0;

    latencies.sort((a, b) => a - b);

    return {
      strategy: benchConfig.strategy,
      mode: benchConfig.mode,
      concurrency: benchConfig.concurrency,
      totalWrites: benchConfig.totalWrites,
      successCount,
      failureCount,
      avgLatencyMs: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      p50LatencyMs: this.percentile(latencies, 50),
      p95LatencyMs: this.percentile(latencies, 95),
      p99LatencyMs: this.percentile(latencies, 99),
      minLatencyMs: latencies.length > 0 ? latencies[0] : 0,
      maxLatencyMs: latencies.length > 0 ? latencies[latencies.length - 1] : 0,
      throughputPerSecond: totalDurationMs > 0 ? (successCount / totalDurationMs) * 1000 : 0,
      totalDurationMs,
      blockchainConfirmationTimeMs: confirmationTime,
      hashAnchoringDelayMs:        Math.round(anchoringDelayMs * 100) / 100,
      integrityVerificationTimeMs: Math.round(verificationTime * 100) / 100,
      storageOverheadBytes:        storageBytes,
      tamperPercent,
      tamperedSamples,
      detectedSamples,
      tamperDetectionRatePercent:  Math.round(tamperRate * 100) / 100,
      tamperedLogs,
      integrityExposureWindowMs:   Math.round(exposureWindowMs * 100) / 100,
      cpuUsagePercent: Math.round(cpuPercent * 100) / 100,
      memoryUsageMB: Math.round(Math.abs(memUsageMB) * 100) / 100,
      timestamp: new Date().toISOString(),
    };
  }

  private generateLogs(count: number): LogEntry[] {
    const levels = Object.values(LogLevel);
    const sources = ['api-gateway', 'auth-service', 'data-pipeline', 'scheduler', 'worker'];
    const logs: LogEntry[] = [];
    for (let i = 0; i < count; i++) {
      logs.push(new LogEntry({
        level: levels[i % levels.length],
        source: sources[i % sources.length],
        message: `Benchmark log entry #${i} at ${Date.now()}`,
        metadata: { benchmarkIndex: i, randomValue: Math.random(), timestamp: Date.now() },
      }));
    }
    return logs;
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }
}

class Semaphore {
  private current = 0;
  private queue: (() => void)[] = [];

  constructor(private readonly max: number) {}

  acquire(): Promise<void> {
    if (this.current < this.max) {
      this.current++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => { this.queue.push(resolve); });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    } else {
      this.current--;
    }
  }
}

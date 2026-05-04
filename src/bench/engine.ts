import { LogStorage, isMetricsProvider } from '../core/LogStorage';
import { LogEntry, LogLevel } from '../core/LogEntry';
import { WriteMode, LogStrategy } from '../core/LogMode';
import { SyncWriter } from '../modes/SyncWriter';
import { AsyncWriter } from '../modes/AsyncWriter';
import { BatchWriter } from '../modes/BatchWriter';

export interface BenchmarkConfig {
  strategy: LogStrategy;
  mode: WriteMode;
  concurrency: number;
  totalWrites: number;
  batchSize: number;
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
  integrityVerificationTimeMs: number;
  cpuUsagePercent: number;
  memoryUsageMB: number;
  timestamp: string;
}

export class BenchmarkEngine {
  constructor(private readonly storages: Map<LogStrategy, LogStorage>) {}

  async run(benchConfig: BenchmarkConfig): Promise<BenchmarkResult> {
    const storage = this.storages.get(benchConfig.strategy);
    if (!storage) {
      throw new Error(`No storage found for strategy: ${benchConfig.strategy}`);
    }

    const logs = this.generateLogs(benchConfig.totalWrites);
    const latencies: number[] = [];
    let successCount = 0;
    let failureCount = 0;

    const cpuBefore = process.cpuUsage();
    const memBefore = process.memoryUsage();
    const startTime = Date.now();

    if (benchConfig.mode === WriteMode.BATCH) {
      const batchWriter = new BatchWriter(storage, benchConfig.batchSize);
      for (const entry of logs) {
        batchWriter.write(entry);
      }
      await batchWriter.flush();
      const batchResult = batchWriter.getLastBatchResult();
      const batchDuration = Date.now() - startTime;
      const perEntry = batchDuration / logs.length;
      for (let i = 0; i < logs.length; i++) {
        latencies.push(perEntry);
      }
      successCount = batchResult ? (batchResult.success ? logs.length : 0) : logs.length;
    } else if (benchConfig.mode === WriteMode.ASYNC) {
      const asyncWriter = new AsyncWriter(storage);
      const semaphore = new Semaphore(benchConfig.concurrency);
      const promises = logs.map(async (entry) => {
        await semaphore.acquire();
        try {
          const writeStart = Date.now();
          asyncWriter.write(entry);
          latencies.push(Date.now() - writeStart);
          successCount++;
        } finally {
          semaphore.release();
        }
      });
      await Promise.all(promises);
    } else {
      const syncWriter = new SyncWriter(storage);
      const semaphore = new Semaphore(benchConfig.concurrency);
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

    const confirmationTime = isMetricsProvider(storage) ? storage.getAvgConfirmationTimeMs() : 0;

    let verificationTime = 0;
    if (successCount > 0 && logs.length > 0) {
      const verifyStart = Date.now();
      await storage.verifyLog(logs[0].id);
      verificationTime = Date.now() - verifyStart;
    }

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
      integrityVerificationTimeMs: verificationTime,
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

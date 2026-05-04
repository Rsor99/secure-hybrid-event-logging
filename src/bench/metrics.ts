import { BenchmarkEngine, BenchmarkConfig, BenchmarkResult } from './engine';

export type BenchmarkCell = BenchmarkConfig;

export async function collectMetrics(engine: BenchmarkEngine, cell: BenchmarkCell): Promise<BenchmarkResult> {
  return engine.run(cell);
}

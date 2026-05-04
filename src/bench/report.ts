import fs from 'fs';
import path from 'path';
import { BenchmarkResult } from './engine';

export function exportResults(results: BenchmarkResult[], prefix = 'benchmark', outputDir = './results'): void {
  const OUTPUT_DIR = path.resolve(process.cwd(), outputDir);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const base = path.join(OUTPUT_DIR, `${prefix}_${ts}`);

  const jsonPath = `${base}.json`;
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2), 'utf8');

  const csvPath = `${base}.csv`;
  if (results.length > 0) {
    const headers = Object.keys(results[0]) as (keyof BenchmarkResult)[];
    const rows = [
      headers.join(','),
      ...results.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')),
    ];
    fs.writeFileSync(csvPath, rows.join('\n'), 'utf8');
  }

  console.log(`Results exported → CSV: ${csvPath} | JSON: ${jsonPath}`);
}

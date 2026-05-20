import { PostgresStorage } from '../adapters/storage/PostgresStorage';
import { MongoStorage } from '../adapters/storage/MongoStorage';
import { PostgresAdapter } from '../infrastructure/database/PostgresAdapter';
import { MongoAdapter } from '../infrastructure/database/MongoAdapter';
import { ExonumAnchor } from '../adapters/storage/ExonumAnchor';
import { EthereumAnchor } from '../adapters/storage/EthereumAnchor';
import { HybridStorage } from '../adapters/composite/HybridStorage';
import { LogStorage } from '../core/LogStorage';
import { LogStrategy, WriteMode } from '../core/LogMode';
import { BenchmarkConfig, BenchmarkEngine } from './engine';
import { collectMetrics } from './metrics';
import { exportResults } from './report';
import { config } from '../infrastructure/config/env';

type DbChoice    = 'postgres' | 'mongo';
type ChainChoice = 'ethereum' | 'exonum';

const ALL_MODES        = [WriteMode.SYNC, WriteMode.ASYNC, WriteMode.BATCH];
const VALID_STRATEGIES = Object.values(LogStrategy);
const VALID_MODES      = Object.values(WriteMode);
const VALID_DBS        = ['postgres', 'mongo'] as const;
const VALID_CHAINS     = ['ethereum', 'exonum'] as const;

// CLI defaults — no need to put these in .env
const DEFAULTS = {
  concurrency: 10,
  totalWrites: 100,
  batchSize:   10,
  exportDir:   config.exportDir,
} as const;

function parseArg(key: string): string | undefined {
  const arg = process.argv.find((a) => a.startsWith(`--${key}=`));
  return arg ? arg.split('=')[1] : undefined;
}

function parseArgInt(key: string, fallback: number): number {
  const raw = parseArg(key);
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  if (isNaN(n) || n <= 0) {
    console.error(`--${key} must be a positive integer, got: "${raw}"`);
    process.exit(1);
  }
  return n;
}

function parseArgList(key: string): string[] {
  const raw = parseArg(key);
  return raw ? raw.split(',') : [];
}

// "Hybrid + batch mode" should anchor a single Merkle root per batch — that's
// the dedicated *_BATCH strategy. Without this, batch mode falls back to
// per-entry writeLog (no Merkle, defeats the point of batch+hybrid).
function effectiveStrategy(strategy: LogStrategy, mode: WriteMode): LogStrategy {
  if (mode !== WriteMode.BATCH) return strategy;
  if (strategy === LogStrategy.HYBRID_PRIVATE) return LogStrategy.HYBRID_PRIVATE_BATCH;
  if (strategy === LogStrategy.HYBRID_PUBLIC)  return LogStrategy.HYBRID_PUBLIC_BATCH;
  return strategy;
}

function makeGroup(strategies: LogStrategy[], modes: WriteMode[], scale: { concurrency: number; totalWrites: number; batchSize: number }): BenchmarkConfig[] {
  const seen = new Set<string>();
  const out: BenchmarkConfig[] = [];
  for (const s of strategies) {
    for (const mode of modes) {
      const strategy = effectiveStrategy(s, mode);
      // Auto-promote can collide when a group lists both HYBRID_PRIVATE and
      // HYBRID_PRIVATE_BATCH — their batch-mode cells resolve to the same
      // (strategy, mode) pair. Dedupe by key so each pair runs at most once.
      const key = `${strategy}|${mode}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ strategy, mode, ...scale });
    }
  }
  return out;
}

function buildGroups(scale: { concurrency: number; totalWrites: number; batchSize: number }): Record<string, BenchmarkConfig[]> {
  return {
    'db-vs-private':       makeGroup([LogStrategy.DATABASE_ONLY, LogStrategy.PRIVATE_CHAIN,        LogStrategy.HYBRID_PRIVATE],       ALL_MODES, scale),
    'db-vs-public':        makeGroup([LogStrategy.DATABASE_ONLY, LogStrategy.PUBLIC_CHAIN,          LogStrategy.HYBRID_PUBLIC],        ALL_MODES, scale),
    'hybrid-vs-public':    makeGroup([LogStrategy.PUBLIC_CHAIN,  LogStrategy.HYBRID_PUBLIC,         LogStrategy.HYBRID_PRIVATE],       ALL_MODES, scale),
    'hybrid-batch-private':makeGroup([LogStrategy.DATABASE_ONLY, LogStrategy.HYBRID_PRIVATE,        LogStrategy.HYBRID_PRIVATE_BATCH], ALL_MODES, scale),
    'hybrid-batch-public': makeGroup([LogStrategy.DATABASE_ONLY, LogStrategy.HYBRID_PUBLIC,         LogStrategy.HYBRID_PUBLIC_BATCH],  ALL_MODES, scale),
  };
}

function printUsage(): void {
  console.log(`
Usage: ts-node src/bench/runner.ts [options]

Storage options:
  --db=<db>                Database backend (default: postgres)
                           Valid: ${VALID_DBS.join(' | ')}

  --chain=<chain>          Blockchain backend (default: private→exonum, public→ethereum)
                           Valid: ${VALID_CHAINS.join(' | ')}

Experiment selection:
  --filter=<group>         Preset experiment group
                           Valid: db-vs-private | db-vs-public | hybrid-vs-public
                                  hybrid-batch-private | hybrid-batch-public

  --strategy=<s>[,<s>...]  Specific strategies
                           Valid: ${VALID_STRATEGIES.join(' | ')}

  --mode=<m>[,<m>...]      Write modes (default: all)
                           Valid: ${VALID_MODES.join(' | ')}

Benchmark tuning:
  --concurrency=N          Parallel writers for sync/async modes (default: ${DEFAULTS.concurrency})
  --total=N                Total log entries per cell (default: ${DEFAULTS.totalWrites})
  --batch-size=N           Entries per batch flush — required when mode includes batch (default: ${DEFAULTS.batchSize})
  --export-dir=PATH        Output directory for results (default: ${DEFAULTS.exportDir})

Storage semantics:
  database_only / private_chain / public_chain  →  full log on target storage
  hybrid_private / hybrid_public               →  full log in DB, hash-only on chain
  batch mode                                   →  ONE combined hash per batch + start/end ID range

Examples:
  ts-node src/bench/runner.ts --strategy=database_only
  ts-node src/bench/runner.ts --db=mongo --strategy=database_only,public_chain --mode=sync
  ts-node src/bench/runner.ts --mode=batch --batch-size=20 --total=200
  ts-node src/bench/runner.ts --filter=db-vs-private --concurrency=20 --total=500
`);
}

function buildAnchors(chainArg: ChainChoice | undefined): {
  privateChainFull: LogStorage;
  publicChainFull: LogStorage;
  privateAnchorHash: LogStorage;
  publicAnchorHash: LogStorage;
} {
  return {
    privateChainFull:  chainArg === 'ethereum' ? new EthereumAnchor('full')     : new ExonumAnchor('full'),
    publicChainFull:   chainArg === 'exonum'   ? new ExonumAnchor('full')        : new EthereumAnchor('full'),
    privateAnchorHash: chainArg === 'ethereum' ? new EthereumAnchor('hash-only') : new ExonumAnchor('hash-only'),
    publicAnchorHash:  chainArg === 'exonum'   ? new ExonumAnchor('hash-only')   : new EthereumAnchor('hash-only'),
  };
}

function buildBatchAnchors(chainArg: ChainChoice | undefined): {
  privateChainBatch: LogStorage;
  publicChainBatch: LogStorage;
} {
  return {
    privateChainBatch: chainArg === 'ethereum' ? new EthereumAnchor('batch') : new ExonumAnchor('batch'),
    publicChainBatch:  chainArg === 'exonum'   ? new ExonumAnchor('batch')   : new EthereumAnchor('batch'),
  };
}

async function main(): Promise<void> {
  if (process.argv.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  const dbArg      = (parseArg('db')    ?? 'postgres') as DbChoice;
  const chainArg   = parseArg('chain') as ChainChoice | undefined;
  const filter     = parseArg('filter');
  const exportDir  = parseArg('export-dir') ?? DEFAULTS.exportDir;
  const strategies = parseArgList('strategy') as LogStrategy[];
  const modes      = parseArgList('mode')     as WriteMode[];

  const concurrency = parseArgInt('concurrency', DEFAULTS.concurrency);
  const totalWrites = parseArgInt('total',        DEFAULTS.totalWrites);

  const requestedModes = modes.length ? modes : ALL_MODES;
  const needsBatch = requestedModes.includes(WriteMode.BATCH);
  const batchSizeArg = parseArg('batch-size');

  if (needsBatch && !batchSizeArg) {
    console.error('Error: --batch-size=N is required when running batch mode.');
    console.error(`  Example: --batch-size=10`);
    process.exit(1);
  }
  const batchSize = parseArgInt('batch-size', DEFAULTS.batchSize);

  if (!VALID_DBS.includes(dbArg)) {
    console.error(`Unknown db: "${dbArg}". Valid: ${VALID_DBS.join(', ')}`);
    process.exit(1);
  }
  if (chainArg && !VALID_CHAINS.includes(chainArg)) {
    console.error(`Unknown chain: "${chainArg}". Valid: ${VALID_CHAINS.join(', ')}`);
    process.exit(1);
  }
  for (const s of strategies) {
    if (!VALID_STRATEGIES.includes(s)) {
      console.error(`Unknown strategy: "${s}". Valid: ${VALID_STRATEGIES.join(', ')}`);
      process.exit(1);
    }
  }
  for (const m of modes) {
    if (!VALID_MODES.includes(m)) {
      console.error(`Unknown mode: "${m}". Valid: ${VALID_MODES.join(', ')}`);
      process.exit(1);
    }
  }

  const scale = { concurrency, totalWrites, batchSize };
  const GROUPS = buildGroups(scale);

  const dbAdapter = dbArg === 'mongo' ? new MongoAdapter() : new PostgresAdapter();
  await dbAdapter.initialize();
  const dbStorage: LogStorage = dbArg === 'mongo'
    ? new MongoStorage(dbAdapter as MongoAdapter)
    : new PostgresStorage(dbAdapter as PostgresAdapter);

  const { privateChainFull, publicChainFull, privateAnchorHash, publicAnchorHash } = buildAnchors(chainArg);

  const { privateChainBatch, publicChainBatch } = buildBatchAnchors(chainArg);

  const storages = new Map<LogStrategy, LogStorage>([
    [LogStrategy.DATABASE_ONLY,        dbStorage],
    [LogStrategy.PRIVATE_CHAIN,        privateChainFull],
    [LogStrategy.PUBLIC_CHAIN,         publicChainFull],
    [LogStrategy.HYBRID_PRIVATE,       new HybridStorage(dbAdapter, privateAnchorHash,  'anchored_private')],
    [LogStrategy.HYBRID_PRIVATE_BATCH, new HybridStorage(dbAdapter, privateChainBatch,  'batched_private')],
    [LogStrategy.HYBRID_PUBLIC,        new HybridStorage(dbAdapter, publicAnchorHash,   'anchored_public')],
    [LogStrategy.HYBRID_PUBLIC_BATCH,  new HybridStorage(dbAdapter, publicChainBatch,   'batched_public')],
  ]);

  const engine = new BenchmarkEngine(
    storages,
    undefined,
    dbArg === 'mongo' ? undefined : (dbAdapter as PostgresAdapter),
    dbArg === 'mongo' ? (dbAdapter as MongoAdapter) : null,
  );

  let matrix: BenchmarkConfig[];
  let label: string;

  if (filter) {
    const group = GROUPS[filter];
    if (!group) {
      console.error(`Unknown filter: "${filter}". Valid: ${Object.keys(GROUPS).join(', ')}`);
      process.exit(1);
    }
    matrix = modes.length ? group.filter((c) => modes.includes(c.mode)) : group;
    label  = [filter, dbArg, chainArg].filter(Boolean).join('_');
  } else if (strategies.length) {
    matrix = makeGroup(strategies, requestedModes, scale);
    label  = [strategies.join('+'), dbArg, chainArg, modes.join('+')].filter(Boolean).join('_');
  } else {
    const all = Object.values(GROUPS).flat();
    matrix = modes.length ? all.filter((c) => modes.includes(c.mode)) : all;
    label  = ['all_experiments', dbArg, chainArg].filter(Boolean).join('_');
  }

  if (matrix.length === 0) {
    console.error('No benchmark cells matched the given options.');
    process.exit(1);
  }

  // Stamp every cell with the active DB so the engine can pick the right adapter.
  for (const cell of matrix) cell.db = dbArg;

  console.log(`DB: ${dbStorage.name}  |  Private chain: ${privateChainFull.name}  |  Public chain: ${publicChainFull.name}`);
  console.log(`Concurrency: ${concurrency}  |  Total writes/cell: ${totalWrites}  |  Batch size: ${batchSize}`);
  console.log(`Cells: ${matrix.length}\n`);

  const results = [];
  for (const cell of matrix) {
    console.log(`Running: ${cell.strategy} / ${cell.mode} / writes=${cell.totalWrites}`);
    const result = await collectMetrics(engine, cell);
    results.push(result);
    console.log(`  → avg=${result.avgLatencyMs.toFixed(1)}ms  p95=${result.p95LatencyMs.toFixed(1)}ms  tput=${result.throughputPerSecond.toFixed(1)}/s`);
  }

  exportResults(results, label, exportDir);
  console.log(`\nDone. ${results.length} cells completed.`);
  await dbStorage.close?.();
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });

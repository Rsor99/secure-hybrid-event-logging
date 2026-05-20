import express from 'express';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { v7 as uuidv7 } from 'uuid';
import { config } from '../infrastructure/config/env';
import {
  PostgresAdapter,
  TBL_ANCHORED_PRIVATE,
  TBL_ANCHORED_PUBLIC,
  TBL_BATCHED_PRIVATE,
  TBL_BATCHED_PUBLIC,
  TBL_BATCHES_PRIVATE,
  TBL_BATCHES_PUBLIC,
} from '../infrastructure/database/PostgresAdapter';
import { MongoAdapter } from '../infrastructure/database/MongoAdapter';
import { PostgresStorage } from '../adapters/storage/PostgresStorage';
import { MongoStorage } from '../adapters/storage/MongoStorage';
import { ExonumAnchor } from '../adapters/storage/ExonumAnchor';
import { EthereumAnchor } from '../adapters/storage/EthereumAnchor';
import { HybridStorage } from '../adapters/composite/HybridStorage';
import { LogStorage } from '../core/LogStorage';
import { LogEntry, LogLevel } from '../core/LogEntry';
import { HashService } from '../core/HashService';
import { SyncWriter } from '../modes/SyncWriter';
import { BatchWriter } from '../modes/BatchWriter';
import { BenchmarkEngine, BenchmarkResult } from '../bench/engine';
import { exportResults } from '../bench/report';
import { WriteMode, LogStrategy } from '../core/LogMode';
import { RabbitMQClient } from '../queue/RabbitMQClient';
import { startSubscriber } from '../queue/subscriber';
import { publishLog, publishConfirm } from '../queue/publisher';
import {
  isChainStrategy,
  chainFor,
  anchoredTableFor,
  batchedTableFor,
  batchesTableFor,
} from '../queue/queues';

async function main(): Promise<void> {
  // ── PostgreSQL (required) ───────────────────────────────────────────────────
  const pgAdapter = new PostgresAdapter();
  await pgAdapter.initialize();
  const pgOffchain = new PostgresStorage(pgAdapter);

  // ── Chain anchors (shared across DB backends) ───────────────────────────────
  const exonumFull     = new ExonumAnchor('full');
  const exonumHash     = new ExonumAnchor('hash-only');
  const exonumBatch    = new ExonumAnchor('batch');
  const ethereumAnchor = new EthereumAnchor();

  // ── PG-backed hybrid storages ───────────────────────────────────────────────
  const pgHybridPrivate      = new HybridStorage(pgAdapter, exonumHash,     'anchored_private');
  const pgHybridPrivBatch    = new HybridStorage(pgAdapter, exonumBatch,    'batched_private');
  const pgHybridPublic       = new HybridStorage(pgAdapter, ethereumAnchor, 'anchored_public');
  const pgHybridPublicBatch  = new HybridStorage(pgAdapter, ethereumAnchor, 'batched_public');

  // ── MongoDB (optional) ──────────────────────────────────────────────────────
  let mongoAdapter:           MongoAdapter  | null = null;
  let mongoOffchain:          MongoStorage  | null = null;
  let mongoHybridPrivate:     HybridStorage | null = null;
  let mongoHybridPrivBatch:   HybridStorage | null = null;
  let mongoHybridPublic:      HybridStorage | null = null;
  let mongoHybridPublicBatch: HybridStorage | null = null;

  try {
    mongoAdapter = new MongoAdapter();
    await mongoAdapter.initialize();
    mongoOffchain          = new MongoStorage(mongoAdapter);
    mongoHybridPrivate     = new HybridStorage(mongoAdapter, exonumHash,     'anchored_private');
    mongoHybridPrivBatch   = new HybridStorage(mongoAdapter, exonumBatch,    'batched_private');
    mongoHybridPublic      = new HybridStorage(mongoAdapter, ethereumAnchor, 'anchored_public');
    mongoHybridPublicBatch = new HybridStorage(mongoAdapter, ethereumAnchor, 'batched_public');
    console.log('MongoDB connected');
  } catch (err) {
    console.warn('MongoDB not available (db=mongo requests will fail):', (err as Error).message);
  }

  // BatchWriters are cached per (strategy, db) so we can attach the right
  // confirm-queue context once and reuse it across requests.
  const batchWriters = new Map<string, BatchWriter>();
  function getBatchWriter(storage: LogStorage, strategy: string, db: 'postgres' | 'mongo'): BatchWriter {
    const key = `${strategy}|${db}`;
    let w = batchWriters.get(key);
    if (w) return w;

    const isChain = isChainStrategy(strategy);
    // For chain strategies we submit-only and let the confirm queue track confirmation.
    const writeOpts = isChain ? { waitForConfirmation: false } : undefined;

    // After each flush, hand off the chain tx to the confirm queue (if applicable)
    // so anchor_status flips from 'pending' → 'confirmed' / 'failed' on its own.
    const onFlush = (mqReady && isChain)
      ? async (result: import('../core/LogStorage').BatchWriteResult) => {
          if (!result.txId || result.confirmed) return;
          const isBatchStrategy = strategy.endsWith('_batch');
          const dbTable     = isBatchStrategy ? batchedTableFor(strategy) : anchoredTableFor(strategy);
          const batchesTbl  = isBatchStrategy ? batchesTableFor(strategy) : undefined;
          // For batched strategies, logId = batch Merkle root (matches batches_* PK).
          // For anchored strategies, writeBatch isn't exposed — falls back to per-entry
          // writeLog, lastBatchResult is null and we never get here.
          await publishConfirm(mqClient, {
            logId:         result.batchHash,
            txHash:        result.txId,
            strategy,
            chain:         chainFor(strategy),
            db,
            dbTable,
            batchesTable:  batchesTbl,
            correlationId: result.batchHash,
            enqueuedAt:    Date.now(),
          });
        }
      : undefined;

    w = new BatchWriter(storage, 10, 1000, writeOpts, onFlush);
    batchWriters.set(key, w);
    return w;
  }

  function pickStorage(storageMode: string | undefined, useMongo: boolean): LogStorage {
    if (storageMode === 'private_chain')        return exonumFull;
    if (storageMode === 'public_chain')         return ethereumAnchor;
    if (storageMode === 'hybrid_public_batch')  return useMongo ? mongoHybridPublicBatch!  : pgHybridPublicBatch;
    if (storageMode === 'hybrid_public')        return useMongo ? mongoHybridPublic!       : pgHybridPublic;
    if (storageMode === 'hybrid_private_batch') return useMongo ? mongoHybridPrivBatch!    : pgHybridPrivBatch;
    if (storageMode === 'hybrid_private')       return useMongo ? mongoHybridPrivate!      : pgHybridPrivate;
    return useMongo ? mongoOffchain! : pgOffchain; // db_only
  }

  // ── RabbitMQ ────────────────────────────────────────────────────────────────
  const mqClient = new RabbitMQClient(config.rabbitmq.url);
  let mqReady = false;
  try {
    await mqClient.connect();
    await mqClient.assertQueues();
    await startSubscriber(
      (strategy, db) => pickStorage(strategy, db === 'mongo'),
      pgAdapter, mongoAdapter, exonumFull, ethereumAnchor, mqClient,
    );
    mqReady = true;
    console.log('[RabbitMQ] connected and subscriber started');
  } catch (err) {
    console.warn('[RabbitMQ] not available — async+chain requests will fall back to awaited writes:', (err as Error).message);
  }

  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // ── POST /log ──────────────────────────────────────────────────────────────

  app.post('/log', async (req, res) => {
    try {
      const { level, source, message, metadata, storageMode, writeMode, db } = req.body as {
        level: LogLevel;
        source: string;
        message: string;
        metadata?: Record<string, unknown>;
        storageMode?: string;
        writeMode?: string;
        db?: string;
      };

      const useMongo = db === 'mongo';
      if (useMongo && !mongoAdapter) {
        return res.status(503).json({ error: 'MongoDB is not available on this server' });
      }

      const storage = pickStorage(storageMode, useMongo);
      const entry = new LogEntry({ level, source, message, metadata });

      // async + chain strategy → publish to RabbitMQ queue, return 202 immediately
      if (writeMode === 'async' && storageMode && isChainStrategy(storageMode) && mqReady) {
        await publishLog(mqClient, entry, storageMode, useMongo ? 'mongo' : 'postgres');
        return res.status(202).json({ log: entry.toPlainObject(), queued: true });
      }

      let result;
      let pendingChain = false;
      if (writeMode === 'async') {
        result = await new SyncWriter(storage).write(entry); // db_only async → direct write
      } else if (writeMode === 'batch') {
        // Batch mode: caller waits for DB persistence (the batch flush) but the
        // chain side is submit-only — confirmation is handed off to the confirm queue.
        const dbName = useMongo ? 'mongo' : 'postgres';
        result = await getBatchWriter(storage, storageMode ?? 'database_only', dbName).write(entry);
        pendingChain = !!result.txId && result.confirmed === false;
      } else {
        result = await new SyncWriter(storage).write(entry);
      }

      res.status(pendingChain ? 202 : 201).json({ log: entry.toPlainObject(), result });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── GET /log/:id ───────────────────────────────────────────────────────────

  app.get('/log/:id', async (req, res) => {
    try {
      const useMongo = req.query.db === 'mongo';
      const adapter = useMongo ? mongoAdapter : pgAdapter;
      if (!adapter) return res.status(503).json({ error: 'MongoDB not available' });
      const log = await adapter.findOffchainById(req.params.id);
      if (!log) return res.status(404).json({ error: 'Not found' });
      res.json(log.toPlainObject());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── GET /logs (backward compat → offchain) ─────────────────────────────────

  app.get('/logs', async (req, res) => {
    try {
      const useMongo = req.query.db === 'mongo';
      const adapter = useMongo ? mongoAdapter : pgAdapter;
      if (!adapter) return res.status(503).json({ error: 'MongoDB not available' });
      const limit  = Math.min(Number(req.query.limit)  || 50, 200);
      const offset = Number(req.query.offset) || 0;
      const level  = req.query.level  as string | undefined;
      const source = req.query.source as string | undefined;
      const { rows, total } = await adapter.listOffchain({ limit, offset, level, source });
      res.json({ rows, total, limit, offset });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── GET /logs/offchain ─────────────────────────────────────────────────────

  app.get('/logs/offchain', async (req, res) => {
    try {
      const useMongo = req.query.db === 'mongo';
      const adapter = useMongo ? mongoAdapter : pgAdapter;
      if (!adapter) return res.status(503).json({ error: 'MongoDB not available' });
      const limit  = Math.min(Number(req.query.limit)  || 50, 200);
      const offset = Number(req.query.offset) || 0;
      const level  = req.query.level  as string | undefined;
      const source = req.query.source as string | undefined;
      const { rows, total } = await adapter.listOffchain({ limit, offset, level, source });
      res.json({ rows, total, limit, offset });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── GET /logs/anchored ─────────────────────────────────────────────────────

  app.get('/logs/anchored', async (req, res) => {
    try {
      const useMongo = req.query.db === 'mongo';
      const adapter = useMongo ? mongoAdapter : pgAdapter;
      if (!adapter) return res.status(503).json({ error: 'MongoDB not available' });
      const chain = req.query.chain as string | undefined;
      const table = chain === 'public' ? TBL_ANCHORED_PUBLIC : TBL_ANCHORED_PRIVATE;
      const limit  = Math.min(Number(req.query.limit)  || 50, 200);
      const offset = Number(req.query.offset) || 0;
      const level  = req.query.level  as string | undefined;
      const source = req.query.source as string | undefined;
      const anchorStatus = req.query.anchorStatus as string | undefined;
      const { rows, total } = await adapter.listAnchored({ limit, offset, level, source, anchorStatus }, table);
      res.json({ rows, total, limit, offset, chain: chain ?? 'private', table });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── GET /logs/batched ──────────────────────────────────────────────────────

  app.get('/logs/batched', async (req, res) => {
    try {
      const useMongo = req.query.db === 'mongo';
      const adapter = useMongo ? mongoAdapter : pgAdapter;
      if (!adapter) return res.status(503).json({ error: 'MongoDB not available' });
      const chain = req.query.chain as string | undefined;
      const table = chain === 'public' ? TBL_BATCHED_PUBLIC : TBL_BATCHED_PRIVATE;
      const limit  = Math.min(Number(req.query.limit)  || 50, 200);
      const offset = Number(req.query.offset) || 0;
      const level  = req.query.level  as string | undefined;
      const batched = req.query.batched as string | undefined;
      const { rows, total } = await adapter.listBatched({ limit, offset, level, batched }, table);
      res.json({ rows, total, limit, offset, chain: chain ?? 'private', table });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── GET /logs/batches ──────────────────────────────────────────────────────

  app.get('/logs/batches', async (req, res) => {
    try {
      const useMongo = req.query.db === 'mongo';
      const adapter = useMongo ? mongoAdapter : pgAdapter;
      if (!adapter) return res.status(503).json({ error: 'MongoDB not available' });
      const chain = req.query.chain as string | undefined;
      const table = chain === 'public' ? TBL_BATCHES_PUBLIC : TBL_BATCHES_PRIVATE;
      const limit  = Math.min(Number(req.query.limit)  || 50, 200);
      const offset = Number(req.query.offset) || 0;
      const { rows, total } = await adapter.listBatches({ limit, offset }, table);
      res.json({ rows, total, limit, offset, chain: chain ?? 'private', table });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── GET /verify/:id ────────────────────────────────────────────────────────

  app.get('/verify/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const useMongo = req.query.db === 'mongo';
      const adapter = (useMongo ? mongoAdapter : pgAdapter)!;

      const offchainLog = await adapter.findOffchainById(id);
      if (offchainLog) {
        const recomputed = HashService.computeLogHash(offchainLog);
        const valid = offchainLog.dataHash ? recomputed === offchainLog.dataHash : true;
        return res.json({
          logId: id,
          table: 'offchain',
          valid,
          details: valid ? 'Hash verified' : 'Hash mismatch — record may be tampered',
        });
      }

      const anchoredRow = await adapter.findAnchoredByIdAny(id);
      if (anchoredRow) {
        const entry = new LogEntry({
          id: anchoredRow.id,
          timestamp: anchoredRow.timestamp,
          level: anchoredRow.level,
          source: anchoredRow.source,
          message: anchoredRow.message,
          metadata: anchoredRow.metadata,
        });
        const recomputed = HashService.computeLogHash(entry);
        const valid = recomputed === anchoredRow.contentHash;
        return res.json({
          logId: id,
          table: 'anchored',
          valid,
          anchorStatus: anchoredRow.anchorStatus,
          anchorTxHash: anchoredRow.anchorTxHash,
          storedHash:   anchoredRow.contentHash,
          recomputed,
          details: valid
            ? `Hash verified (anchor: ${anchoredRow.anchorStatus})`
            : 'Hash mismatch — record may be tampered',
        });
      }

      const batchedHit = await adapter.findBatchedByIdAny(id);
      if (batchedHit) {
        const { row, table } = batchedHit;
        const entry = new LogEntry({
          id: row.id,
          timestamp: row.timestamp,
          level: row.level,
          source: row.source,
          message: row.message,
          metadata: row.metadata,
        });
        const recomputed = HashService.computeLogHash(entry);
        const hashMatch = recomputed === row.contentHash;

        let merkleMatch: boolean | null = null;
        let merkleDetails = '';
        if (row.batchRoot) {
          const siblings = await adapter.listBatchedByRoot(row.batchRoot, table);
          const recomputedRoot = HashService.computeBatchHash(
            siblings.map((r) => ({ dataHash: r.contentHash } as LogEntry)),
          );
          merkleMatch = recomputedRoot === row.batchRoot;
          merkleDetails = merkleMatch
            ? `Leaf #${row.leafIndex} of ${siblings.length} verified in Merkle tree`
            : `Merkle root mismatch (expected ${row.batchRoot.slice(0, 12)}…, got ${recomputedRoot.slice(0, 12)}…)`;
        }

        return res.json({
          logId:       id,
          table:       'batched',
          dbTable:     table,
          valid:       hashMatch && (merkleMatch ?? true),
          hashMatch,
          merkleMatch,
          leafIndex:   row.leafIndex,
          batchRoot:   row.batchRoot,
          storedHash:  row.contentHash,
          recomputed,
          details:     !hashMatch
            ? 'Content hash mismatch — record may be tampered'
            : row.batchRoot
              ? merkleDetails
              : 'Hash verified. Batch not yet assigned (Merkle root pending).',
        });
      }

      res.status(404).json({ logId: id, valid: false, details: 'Not found in any table' });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── GET /verify-batch/:id ──────────────────────────────────────────────────

  app.get('/verify-batch/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const useMongo = req.query.db === 'mongo';
      const adapter = (useMongo ? mongoAdapter : pgAdapter)!;
      const chain = req.query.chain as string | undefined;
      const batchedTable = chain === 'public' ? TBL_BATCHED_PUBLIC : TBL_BATCHED_PRIVATE;

      // fetch the target log
      const row = await adapter.findBatchedById(id, batchedTable);
      if (!row) return res.status(404).json({ valid: false, details: 'Log not found in batched table' });

      // step 1: verify content hash
      const entry = new LogEntry({
        id: row.id, timestamp: row.timestamp, level: row.level,
        source: row.source, message: row.message, metadata: row.metadata,
      });
      const recomputed = HashService.computeLogHash(entry);
      const hashMatch = recomputed === row.contentHash;

      // step 2: verify merkle inclusion (only if batch assigned)
      let merkleMatch: boolean | null = null;
      let merkleDetails = '';
      if (row.batchRoot) {
        const siblings = await adapter.listBatchedByRoot(row.batchRoot, batchedTable);
        const recomputedRoot = HashService.computeBatchHash(
          siblings.map((r) => ({ dataHash: r.contentHash } as LogEntry)),
        );
        merkleMatch = recomputedRoot === row.batchRoot;
        merkleDetails = merkleMatch
          ? `Leaf #${row.leafIndex} of ${siblings.length} verified in Merkle tree`
          : `Merkle root mismatch (expected ${row.batchRoot.slice(0, 12)}…, got ${recomputedRoot.slice(0, 12)}…)`;
      }

      res.json({
        logId:       id,
        table:       batchedTable,
        hashMatch,
        merkleMatch,
        leafIndex:   row.leafIndex,
        batchRoot:   row.batchRoot,
        contentHash: row.contentHash,
        recomputed,
        valid: hashMatch && (merkleMatch ?? true),
        details: !hashMatch
          ? 'Content hash mismatch — record may be tampered'
          : row.batchRoot
            ? merkleDetails
            : 'Hash verified. Batch not yet assigned (Merkle root pending).',
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── GET /verify-offchain/:hash ─────────────────────────────────────────────

  app.get('/verify-offchain/:hash', async (req, res) => {
    try {
      const contentHash = req.params.hash;
      const useMongo = req.query.db === 'mongo';
      const adapter = (useMongo ? mongoAdapter : pgAdapter)!;
      const chain = req.query.chain as string | undefined;

      const row = chain
        ? await adapter.findAnchoredByHash(contentHash, chain === 'public' ? TBL_ANCHORED_PUBLIC : TBL_ANCHORED_PRIVATE)
        : await adapter.findAnchoredByHashAny(contentHash);
      if (!row) {
        return res.json({ content_hash: contentHash, found_in_db: false, match: false });
      }
      const entry = new LogEntry({
        id: row.id,
        timestamp: row.timestamp,
        level: row.level,
        source: row.source,
        message: row.message,
        metadata: row.metadata,
      });
      const recomputed = HashService.computeLogHash(entry);
      res.json({
        content_hash:    contentHash,
        found_in_db:     true,
        recomputed_hash: recomputed,
        match:           recomputed === contentHash,
        log: {
          id:        row.id,
          level:     row.level,
          source:    row.source,
          timestamp: row.timestamp,
          message:   row.message.slice(0, 200),
        },
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Proxy: chain endpoints ─────────────────────────────────────────────────

  app.get('/chain/logs', async (req, res) => {
    try {
      const offset = Number(req.query.offset) || 0;
      const limit  = Math.min(Number(req.query.limit) || 20, 200);
      const r = await axios.get(
        `${config.exonum.nodeUrl}/api/services/${config.exonum.logServiceName}/v1/logs/list`,
        { params: { offset, limit } },
      );
      res.json(r.data);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/chain/hashes', async (req, res) => {
    try {
      const offset = Number(req.query.offset) || 0;
      const limit  = Math.min(Number(req.query.limit) || 20, 200);
      const r = await axios.get(
        `${config.exonum.nodeUrl}/api/services/${config.exonum.hashServiceName}/v1/hashes/list`,
        { params: { offset, limit } },
      );
      res.json(r.data);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/chain/batches', async (req, res) => {
    try {
      const offset = Number(req.query.offset) || 0;
      const limit  = Math.min(Number(req.query.limit) || 20, 200);
      const r = await axios.get(
        `${config.exonum.nodeUrl}/api/services/${config.exonum.batchServiceName}/v1/batches/list`,
        { params: { offset, limit } },
      );
      res.json(r.data);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── POST /experiment/run ──────────────────────────────────────────────────

  app.post('/experiment/run', async (req, res) => {
    try {
      const {
        strategy,
        mode,
        concurrency = 10,
        totalWrites = 100,
        batchSize   = 10,
        db,
      } = req.body as {
        strategy: string;
        mode: string;
        concurrency?: number;
        totalWrites?: number;
        batchSize?: number;
        db?: string;
      };

      if (!strategy || !mode) {
        return res.status(400).json({ error: 'strategy and mode are required' });
      }

      const useMongo = db === 'mongo';
      if (useMongo && !mongoAdapter) {
        return res.status(503).json({ error: 'MongoDB is not available on this server' });
      }

      const storage  = pickStorage(strategy, useMongo);
      const storageMap = new Map<LogStrategy, LogStorage>([[strategy as LogStrategy, storage]]);
      const engine   = new BenchmarkEngine(
        storageMap,
        mqReady ? mqClient : undefined,
        pgAdapter,
        mongoAdapter,
      );

      const result = await engine.run({
        strategy:    strategy    as LogStrategy,
        mode:        mode        as WriteMode,
        concurrency: Number(concurrency),
        totalWrites: Number(totalWrites),
        batchSize:   Number(batchSize),
        db:          useMongo ? 'mongo' : 'postgres',
      });

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── POST /experiment/run-suite — full 24-cell matrix ─────────────────────
  // 8 architectures (DB-only × 2 + BC-only × 2 + Hybrid × 4) × 3 modes = 24 cells.
  // Long-running: client polls /experiment/run-suite/:runId for progress.

  type SuiteRun = {
    runId:    string;
    total:    number;
    current:  number;
    label:    string;
    results:  BenchmarkResult[];
    status:   'running' | 'done' | 'error';
    error?:   string;
    jsonPath?: string;
    csvPath?:  string;
    startedAt: number;
    finishedAt?: number;
  };
  const suiteRuns = new Map<string, SuiteRun>();

  // Mirrors runner.ts effectiveStrategy: hybrid_* + batch should anchor a
  // Merkle root, which lives in the dedicated *_BATCH strategy.
  function effectiveStrategy(s: LogStrategy, m: WriteMode): LogStrategy {
    if (m !== WriteMode.BATCH) return s;
    if (s === LogStrategy.HYBRID_PRIVATE) return LogStrategy.HYBRID_PRIVATE_BATCH;
    if (s === LogStrategy.HYBRID_PUBLIC)  return LogStrategy.HYBRID_PUBLIC_BATCH;
    return s;
  }

  type CellRequest = {
    strategy:    string;
    db:          'postgres' | 'mongo';
    mode:        string;
    totalWrites?: number;
    concurrency?: number;
    batchSize?:   number;
    tamperPercent?: number;
  };

  async function runSuite(run: SuiteRun, cells: CellRequest[], defaults: { concurrency: number; totalWrites: number; batchSize: number; tamperPercent: number }) {
    try {
      for (const cell of cells) {
        if (cell.db === 'mongo' && !mongoAdapter) {
          run.results.push({
            strategy: cell.strategy, mode: cell.mode,
            concurrency: cell.concurrency ?? defaults.concurrency,
            totalWrites: cell.totalWrites ?? defaults.totalWrites,
            successCount: 0, failureCount: cell.totalWrites ?? defaults.totalWrites,
            avgLatencyMs: 0, p50LatencyMs: 0, p95LatencyMs: 0, p99LatencyMs: 0,
            minLatencyMs: 0, maxLatencyMs: 0, throughputPerSecond: 0, totalDurationMs: 0,
            blockchainConfirmationTimeMs: 0, hashAnchoringDelayMs: 0,
            integrityVerificationTimeMs: 0, storageOverheadBytes: 0,
            tamperPercent: 0, tamperedSamples: 0, detectedSamples: 0,
            tamperDetectionRatePercent: 0, tamperedLogs: [],
            integrityExposureWindowMs: 0, cpuUsagePercent: 0, memoryUsageMB: 0,
            timestamp: new Date().toISOString(),
          });
          run.current += 1;
          continue;
        }

        const mode     = cell.mode as WriteMode;
        const strategy = effectiveStrategy(cell.strategy as LogStrategy, mode);
        const useMongo = cell.db === 'mongo';
        const storage  = pickStorage(strategy, useMongo);
        const storageMap = new Map<LogStrategy, LogStorage>([[strategy, storage]]);
        const engine = new BenchmarkEngine(
          storageMap,
          mqReady ? mqClient : undefined,
          pgAdapter,
          mongoAdapter,
        );

        const result = await engine.run({
          strategy,
          mode,
          concurrency:   cell.concurrency   ?? defaults.concurrency,
          totalWrites:   cell.totalWrites   ?? defaults.totalWrites,
          batchSize:     cell.batchSize     ?? defaults.batchSize,
          tamperPercent: cell.tamperPercent ?? defaults.tamperPercent,
          db:            cell.db,
        });
        run.results.push(result);
        run.current += 1;
      }

      const { jsonPath, csvPath } = exportResults(run.results, run.label, config.exportDir);
      run.jsonPath  = path.basename(jsonPath);
      run.csvPath   = path.basename(csvPath);
      run.status    = 'done';
      run.finishedAt = Date.now();
    } catch (err) {
      run.status     = 'error';
      run.error      = String(err);
      run.finishedAt = Date.now();
    }
  }

  app.post('/experiment/run-suite', (req, res) => {
    const {
      cells,
      concurrency   = 5,
      totalWrites   = 20,
      batchSize     = 5,
      tamperPercent = 10,
      label,
    } = req.body ?? {};

    if (!Array.isArray(cells) || cells.length === 0) {
      return res.status(400).json({ error: 'cells must be a non-empty array' });
    }

    const runId: string = uuidv7();
    const run: SuiteRun = {
      runId,
      total:   cells.length,
      current: 0,
      label:   String(label ?? `suite_${runId}`),
      results: [],
      status:  'running',
      startedAt: Date.now(),
    };
    suiteRuns.set(runId, run);

    runSuite(run, cells as CellRequest[], {
      concurrency:   Number(concurrency),
      totalWrites:   Number(totalWrites),
      batchSize:     Number(batchSize),
      tamperPercent: Number(tamperPercent),
    });

    res.status(202).json({ runId, total: cells.length });
  });

  app.get('/experiment/run-suite/:runId', (req, res) => {
    const run = suiteRuns.get(req.params.runId);
    if (!run) return res.status(404).json({ error: 'runId not found' });
    res.json(run);
  });

  // ── POST /experiment/reset-db — drop & recreate all log tables
  // Wipes both Postgres and Mongo (if available) so a fresh experiment run
  // starts with empty tables — useful for storage-overhead and tamper metrics.
  app.post('/experiment/reset-db', async (_req, res) => {
    try {
      await pgAdapter.dropAll();
      await pgAdapter.initialize();
      let mongoCleared = false;
      if (mongoAdapter) {
        await mongoAdapter.dropAll();
        await mongoAdapter.initialize();
        mongoCleared = true;
      }
      res.json({ ok: true, postgres: true, mongo: mongoCleared });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── GET /experiment/download/:filename — serves CSV / JSON from results dir
  app.get('/experiment/download/:filename', (req, res) => {
    const filename = req.params.filename;
    // Reject anything with separators — we only serve flat names from EXPORT_DIR.
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      return res.status(400).json({ error: 'invalid filename' });
    }
    const filePath = path.resolve(process.cwd(), config.exportDir, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'file not found' });
    res.download(filePath);
  });

  // ── Health ─────────────────────────────────────────────────────────────────

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      pg:    pgAdapter.name,
      mongo: mongoAdapter ? mongoAdapter.name : 'unavailable',
    });
  });

  const server = app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });

  const shutdown = async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await mqClient.close().catch(() => {});
    await mongoAdapter?.close().catch(() => {});
    await pgAdapter.close().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT',  shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => { console.error(err); process.exit(1); });

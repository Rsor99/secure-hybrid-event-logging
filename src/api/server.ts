import express from 'express';
import axios from 'axios';
import { config } from '../infrastructure/config/env';
import { PostgresStorage } from '../adapters/storage/PostgresStorage';
import { ExonumAnchor } from '../adapters/storage/ExonumAnchor';
import { EthereumAnchor } from '../adapters/storage/EthereumAnchor';
import { HybridStorage } from '../adapters/composite/HybridStorage';
import { LogStorage } from '../core/LogStorage';
import { LogEntry, LogLevel } from '../core/LogEntry';
import { HashService } from '../core/HashService';
import { SyncWriter } from '../modes/SyncWriter';
import { AsyncWriter } from '../modes/AsyncWriter';
import { BatchWriter } from '../modes/BatchWriter';

async function main(): Promise<void> {
  const pgStorage = new PostgresStorage();
  await pgStorage.initialize();

  // LogService: stores full log on chain (private_chain)
  const exonumFull  = new ExonumAnchor('full');
  // HashService: anchors single hash (hybrid_private sync)
  const exonumHash  = new ExonumAnchor('hash-only');
  // BatchService: anchors batch range with start_id/end_id/count (hybrid_private batch)
  const exonumBatch = new ExonumAnchor('batch');

  const ethereumAnchor  = new EthereumAnchor();
  const hybridPrivate   = new HybridStorage(pgStorage, exonumHash);
  const hybridPrivBatch = new HybridStorage(pgStorage, exonumBatch);
  const hybridPublic    = new HybridStorage(pgStorage, ethereumAnchor);

  const batchWriters = new Map<LogStorage, BatchWriter>();
  function getBatchWriter(storage: LogStorage): BatchWriter {
    let w = batchWriters.get(storage);
    if (!w) {
      w = new BatchWriter(storage, 10);
      batchWriters.set(storage, w);
    }
    return w;
  }

  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.post('/log', async (req, res) => {
    try {
      const { level, source, message, metadata, storageMode, writeMode } = req.body as {
        level: LogLevel;
        source: string;
        message: string;
        metadata?: Record<string, unknown>;
        storageMode?: string;
        writeMode?: string;
      };

      const storage: LogStorage =
        storageMode === 'hybrid_public'        ? hybridPublic    :
        storageMode === 'hybrid_private'       ? hybridPrivate   :
        storageMode === 'hybrid_private_batch' ? hybridPrivBatch :
        storageMode === 'private_chain'        ? exonumFull      :
        storageMode === 'public_chain'         ? ethereumAnchor  :
        pgStorage;

      const entry = new LogEntry({ level, source, message, metadata });

      let result;
      if (writeMode === 'async') {
        result = new AsyncWriter(storage).write(entry);
      } else if (writeMode === 'batch') {
        result = getBatchWriter(storage).write(entry);
      } else {
        result = await new SyncWriter(storage).write(entry);
      }

      res.status(201).json({ log: entry.toPlainObject(), result });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/log/:id', async (req, res) => {
    try {
      const log = await pgStorage.readLog(req.params.id);
      if (!log) return res.status(404).json({ error: 'Not found' });
      res.json(log.toPlainObject());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/logs', async (req, res) => {
    try {
      const limit  = Math.min(Number(req.query.limit)  || 50, 200);
      const offset = Number(req.query.offset) || 0;
      const level  = req.query.level  as string | undefined;
      const source = req.query.source as string | undefined;
      const logs = await pgStorage.readLogs({ limit, offset, level, source });
      res.json({ logs, limit, offset });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/verify/:id', async (req, res) => {
    try {
      const result = await pgStorage.verifyLog(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Verify off-chain log matches on-chain hash (hybrid single mode)
  app.get('/verify-offchain/:hash', async (req, res) => {
    try {
      const contentHash = req.params.hash;
      const log = await pgStorage.readLogByHash(contentHash);
      if (!log) {
        return res.json({ content_hash: contentHash, found_in_db: false, match: false });
      }
      const recomputed = HashService.computeLogHash(log);
      res.json({
        content_hash:    contentHash,
        found_in_db:     true,
        recomputed_hash: recomputed,
        match:           recomputed === contentHash,
        log: {
          id:        log.id,
          level:     log.level,
          source:    log.source,
          timestamp: log.timestamp,
          message:   log.message.slice(0, 200),
        },
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Proxy: list full logs stored on Exonum chain (log-service)
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

  // Proxy: list hash anchors stored on Exonum chain (hash-service)
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

  // Proxy: list batch anchors stored on Exonum chain (batch-service)
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

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', db: pgStorage.name });
  });

  const server = app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });

  process.on('SIGINT',  () => { server.close(); pgStorage.close().then(() => process.exit(0)); });
  process.on('SIGTERM', () => { server.close(); pgStorage.close().then(() => process.exit(0)); });
}

main().catch(err => { console.error(err); process.exit(1); });

import { LogEntry, LogLevel } from '../../core/LogEntry';
import { config } from '../config/env';
import {
  ListOpts,
  PageResult,
  AnchoredRow,
  BatchedRow,
  BatchRow,
  TBL_OFFCHAIN,
  TBL_ANCHORED_PRIVATE,
  TBL_ANCHORED_PUBLIC,
  TBL_BATCHED_PRIVATE,
  TBL_BATCHED_PUBLIC,
  TBL_BATCHES_PRIVATE,
  TBL_BATCHES_PUBLIC,
  ALL_ANCHORED_TABLES,
  ALL_BATCHED_TABLES,
} from './PostgresAdapter';

// ── duck-typed MongoDB interfaces ─────────────────────────────────────────────

interface MongoDoc extends Record<string, unknown> {}

interface IMongoCollection {
  createIndex(spec: Record<string, unknown>, opts?: Record<string, unknown>): Promise<unknown>;
  insertOne(doc: MongoDoc): Promise<unknown>;
  findOne(filter: Record<string, unknown>): Promise<MongoDoc | null>;
  find(filter: Record<string, unknown>): {
    sort(spec: Record<string, number>): {
      skip(n: number): {
        limit(n: number): {
          toArray(): Promise<MongoDoc[]>;
        };
      };
    };
  };
  countDocuments(filter: Record<string, unknown>): Promise<number>;
  updateOne(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
  ): Promise<{ modifiedCount: number }>;
  updateMany(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
  ): Promise<{ modifiedCount: number }>;
}

interface IMongoDb {
  collection(name: string): IMongoCollection;
}

interface IMongoClient {
  connect(): Promise<void>;
  db(name: string): IMongoDb;
  close(): Promise<void>;
}

interface IMongoClientCtor {
  new(uri: string, opts?: Record<string, unknown>): IMongoClient;
}

let MongoClientCtor: IMongoClientCtor | undefined;

try {
  const mod = require('mongodb') as { MongoClient: IMongoClientCtor };
  MongoClientCtor = mod.MongoClient;
} catch {
  // mongodb is an optional dependency
}

// ── level mapping ─────────────────────────────────────────────────────────────

const LEVEL_TO_INT: Record<string, number> = {
  DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, CRITICAL: 4,
};
const INT_TO_LEVEL: Record<number, LogLevel> = {
  0: LogLevel.DEBUG, 1: LogLevel.INFO, 2: LogLevel.WARN, 3: LogLevel.ERROR, 4: LogLevel.CRITICAL,
};

function levelToInt(level: string): number {
  return LEVEL_TO_INT[level.toUpperCase()] ?? 1;
}
function intToLevel(n: number): LogLevel {
  return INT_TO_LEVEL[n] ?? LogLevel.INFO;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function buildFilter(opts: { level?: string; source?: string }): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (opts.level) filter.level = levelToInt(opts.level);
  if (opts.source) filter.source = { $regex: opts.source, $options: 'i' };
  return filter;
}

function docToLogEntry(doc: MongoDoc): LogEntry {
  return new LogEntry({
    id: String(doc._id),
    timestamp: new Date(doc.timestamp as number),
    level: intToLevel(doc.level as number),
    source: doc.source as string,
    message: doc.message as string,
    metadata: (doc.metadata ?? {}) as Record<string, unknown>,
  });
}

function docToAnchoredRow(doc: MongoDoc): AnchoredRow {
  return {
    id: String(doc._id),
    timestamp: new Date(doc.timestamp as number),
    level: intToLevel(doc.level as number),
    source: doc.source as string,
    message: doc.message as string,
    metadata: (doc.metadata ?? {}) as Record<string, unknown>,
    createdAt: new Date(doc.createdAt as number),
    contentHash: doc.contentHash as string,
    anchorStatus: (doc.anchorStatus as 'pending' | 'confirmed' | 'failed') ?? 'pending',
    anchorTxHash: doc.anchorTxHash as string | undefined,
    anchorBlock: doc.anchorBlock != null ? Number(doc.anchorBlock) : undefined,
    anchoredAt: doc.anchoredAt ? new Date(doc.anchoredAt as number) : undefined,
  };
}

function docToBatchedRow(doc: MongoDoc): BatchedRow {
  return {
    id: String(doc._id),
    timestamp: new Date(doc.timestamp as number),
    level: intToLevel(doc.level as number),
    source: doc.source as string,
    message: doc.message as string,
    metadata: (doc.metadata ?? {}) as Record<string, unknown>,
    createdAt: new Date(doc.createdAt as number),
    contentHash: doc.contentHash as string,
    batchRoot: doc.batchRoot as string | undefined,
    leafIndex: doc.leafIndex != null ? Number(doc.leafIndex) : undefined,
  };
}

function docToBatchRow(doc: MongoDoc): BatchRow {
  return {
    merkleRoot: String(doc._id),
    startId: doc.startId as string,
    endId: doc.endId as string,
    logCount: Number(doc.logCount),
    debugCount: Number(doc.debugCount),
    infoCount: Number(doc.infoCount),
    warnCount: Number(doc.warnCount),
    errorCount: Number(doc.errorCount),
    criticalCount: Number(doc.criticalCount),
    maxSeverity: Number(doc.maxSeverity),
    anchorStatus: (doc.anchorStatus as 'pending' | 'confirmed' | 'failed') ?? 'pending',
    anchorTxHash: doc.anchorTxHash as string | undefined,
    anchorBlock: doc.anchorBlock != null ? Number(doc.anchorBlock) : undefined,
    anchoredAt: doc.anchoredAt ? new Date(doc.anchoredAt as number) : undefined,
    createdAt: new Date(doc.createdAt as number),
  };
}

// ── adapter ───────────────────────────────────────────────────────────────────

export class MongoAdapter {
  readonly name = 'MongoDB';
  private client!: IMongoClient;
  private colOffchain!: IMongoCollection;
  private colAnchoredPrivate!: IMongoCollection;
  private colAnchoredPublic!: IMongoCollection;
  private colBatchedPrivate!: IMongoCollection;
  private colBatchedPublic!: IMongoCollection;
  private colBatchesPrivate!: IMongoCollection;
  private colBatchesPublic!: IMongoCollection;

  constructor() {
    if (!MongoClientCtor) {
      throw new Error('mongodb package is not installed. Run: npm install mongodb');
    }
    this.client = new MongoClientCtor(config.mongodb.uri, {
      maxPoolSize: config.mongodb.poolSize,
      connectTimeoutMS: 5000,
    });
  }

  async initialize(): Promise<void> {
    await this.client.connect();
    const db = this.client.db(config.mongodb.name);

    this.colOffchain        = db.collection(TBL_OFFCHAIN);
    this.colAnchoredPrivate = db.collection(TBL_ANCHORED_PRIVATE);
    this.colAnchoredPublic  = db.collection(TBL_ANCHORED_PUBLIC);
    this.colBatchedPrivate  = db.collection(TBL_BATCHED_PRIVATE);
    this.colBatchedPublic   = db.collection(TBL_BATCHED_PUBLIC);
    this.colBatchesPrivate  = db.collection(TBL_BATCHES_PRIVATE);
    this.colBatchesPublic   = db.collection(TBL_BATCHES_PUBLIC);

    // offchain indexes
    await this.colOffchain.createIndex({ timestamp: -1 });
    await this.colOffchain.createIndex({ level: 1 });
    await this.colOffchain.createIndex({ source: 1 });

    // anchored private indexes
    await this.colAnchoredPrivate.createIndex({ timestamp: -1 });
    await this.colAnchoredPrivate.createIndex({ level: 1 });
    await this.colAnchoredPrivate.createIndex({ source: 1 });
    await this.colAnchoredPrivate.createIndex({ contentHash: 1 }, { unique: true });
    await this.colAnchoredPrivate.createIndex({ anchorStatus: 1 });

    // anchored public indexes
    await this.colAnchoredPublic.createIndex({ timestamp: -1 });
    await this.colAnchoredPublic.createIndex({ level: 1 });
    await this.colAnchoredPublic.createIndex({ source: 1 });
    await this.colAnchoredPublic.createIndex({ contentHash: 1 }, { unique: true });
    await this.colAnchoredPublic.createIndex({ anchorStatus: 1 });

    // batched private indexes
    await this.colBatchedPrivate.createIndex({ timestamp: -1 });
    await this.colBatchedPrivate.createIndex({ level: 1 });
    await this.colBatchedPrivate.createIndex({ source: 1 });
    await this.colBatchedPrivate.createIndex({ contentHash: 1 }, { unique: true });
    await this.colBatchedPrivate.createIndex({ batchRoot: 1 });

    // batched public indexes
    await this.colBatchedPublic.createIndex({ timestamp: -1 });
    await this.colBatchedPublic.createIndex({ level: 1 });
    await this.colBatchedPublic.createIndex({ source: 1 });
    await this.colBatchedPublic.createIndex({ contentHash: 1 }, { unique: true });
    await this.colBatchedPublic.createIndex({ batchRoot: 1 });

    // batches private indexes
    await this.colBatchesPrivate.createIndex({ createdAt: -1 });
    await this.colBatchesPrivate.createIndex({ anchorStatus: 1 });

    // batches public indexes
    await this.colBatchesPublic.createIndex({ createdAt: -1 });
    await this.colBatchesPublic.createIndex({ anchorStatus: 1 });
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  async dropAll(): Promise<void> {
    const db = this.client.db(config.mongodb.name);
    const cmd = (db as unknown as { command(c: Record<string, unknown>): Promise<unknown> }).command.bind(db);
    const collections = [
      TBL_BATCHED_PRIVATE,
      TBL_BATCHED_PUBLIC,
      TBL_BATCHES_PRIVATE,
      TBL_BATCHES_PUBLIC,
      TBL_ANCHORED_PRIVATE,
      TBL_ANCHORED_PUBLIC,
      TBL_OFFCHAIN,
      'logs_batched',
      'batches',
      'logs_anchored',
      'logs',
    ];
    for (const col of collections) {
      try { await cmd({ drop: col }); } catch { /* collection may not exist */ }
    }
  }

  // ── collection resolver ──────────────────────────────────────────────────────

  private col(name: string): IMongoCollection {
    return this.client.db(config.mongodb.name).collection(name);
  }

  // ── offchain ────────────────────────────────────────────────────────────────

  async insertOffchain(log: LogEntry): Promise<void> {
    await this.colOffchain.insertOne({
      _id: log.id,
      timestamp: log.timestamp.getTime(),
      level: levelToInt(log.level),
      source: log.source,
      message: log.message,
      metadata: log.metadata,
      createdAt: Date.now(),
    });
  }

  async findOffchainById(id: string): Promise<LogEntry | null> {
    const doc = await this.colOffchain.findOne({ _id: id });
    if (!doc) return null;
    return docToLogEntry(doc);
  }

  async listOffchain(opts: ListOpts = {}): Promise<PageResult<LogEntry>> {
    const { limit = 50, offset = 0 } = opts;
    const filter = buildFilter(opts);

    const total = await this.colOffchain.countDocuments(filter);
    const docs = await this.colOffchain
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    return { rows: docs.map(docToLogEntry), total };
  }

  // ── anchored ────────────────────────────────────────────────────────────────

  async insertAnchored(log: LogEntry, contentHash: string, col: string): Promise<void> {
    await this.col(col).insertOne({
      _id: log.id,
      timestamp: log.timestamp.getTime(),
      level: levelToInt(log.level),
      source: log.source,
      message: log.message,
      metadata: log.metadata,
      createdAt: Date.now(),
      contentHash,
      anchorStatus: 'pending',
      anchorTxHash: null,
      anchorBlock: null,
      anchoredAt: null,
    });
  }

  async updateAnchorStatus(
    id: string,
    status: string,
    txHash: string | undefined,
    block: number | undefined,
    anchoredAt: Date | undefined,
    col: string,
  ): Promise<void> {
    await this.col(col).updateOne(
      { _id: id },
      {
        $set: {
          anchorStatus: status,
          anchorTxHash: txHash ?? null,
          anchorBlock: block ?? null,
          anchoredAt: anchoredAt ? anchoredAt.getTime() : null,
        },
      },
    );
  }

  async listAnchored(opts: ListOpts = {}, col: string): Promise<PageResult<AnchoredRow>> {
    const { limit = 50, offset = 0 } = opts;
    const filter = buildFilter(opts);

    const total = await this.col(col).countDocuments(filter);
    const docs = await this.col(col)
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    return { rows: docs.map(docToAnchoredRow), total };
  }

  async findAnchoredById(id: string, col: string): Promise<AnchoredRow | null> {
    const doc = await this.col(col).findOne({ _id: id });
    if (!doc) return null;
    return docToAnchoredRow(doc);
  }

  async findAnchoredByHash(contentHash: string, col: string): Promise<AnchoredRow | null> {
    const doc = await this.col(col).findOne({ contentHash });
    if (!doc) return null;
    return docToAnchoredRow(doc);
  }

  async findAnchoredByIdAny(id: string): Promise<AnchoredRow | null> {
    for (const t of ALL_ANCHORED_TABLES) {
      const row = await this.findAnchoredById(id, t);
      if (row) return row;
    }
    return null;
  }

  async findAnchoredByHashAny(contentHash: string): Promise<AnchoredRow | null> {
    for (const t of ALL_ANCHORED_TABLES) {
      const row = await this.findAnchoredByHash(contentHash, t);
      if (row) return row;
    }
    return null;
  }

  // ── batched ─────────────────────────────────────────────────────────────────

  async insertBatched(log: LogEntry, contentHash: string, col: string): Promise<void> {
    await this.col(col).insertOne({
      _id: log.id,
      timestamp: log.timestamp.getTime(),
      level: levelToInt(log.level),
      source: log.source,
      message: log.message,
      metadata: log.metadata,
      createdAt: Date.now(),
      contentHash,
      batchRoot: null,
      leafIndex: null,
    });
  }

  async insertBatchRecord(meta: BatchRow, col: string): Promise<void> {
    await this.col(col).insertOne({
      _id: meta.merkleRoot,
      startId: meta.startId,
      endId: meta.endId,
      logCount: meta.logCount,
      debugCount: meta.debugCount,
      infoCount: meta.infoCount,
      warnCount: meta.warnCount,
      errorCount: meta.errorCount,
      criticalCount: meta.criticalCount,
      maxSeverity: meta.maxSeverity,
      anchorStatus: meta.anchorStatus,
      anchorTxHash: meta.anchorTxHash ?? null,
      anchorBlock: meta.anchorBlock ?? null,
      anchoredAt: meta.anchoredAt ? meta.anchoredAt.getTime() : null,
      createdAt: Date.now(),
    });
  }

  async linkBatchLeaves(ids: string[], merkleRoot: string, col: string): Promise<void> {
    for (let i = 0; i < ids.length; i++) {
      await this.col(col).updateOne(
        { _id: ids[i] },
        { $set: { batchRoot: merkleRoot, leafIndex: i } },
      );
    }
  }

  async updateBatchAnchorStatus(
    merkleRoot: string,
    status: string,
    txHash: string | undefined,
    block: number | undefined,
    anchoredAt: Date | undefined,
    col: string,
  ): Promise<void> {
    await this.col(col).updateOne(
      { _id: merkleRoot },
      {
        $set: {
          anchorStatus: status,
          anchorTxHash: txHash ?? null,
          anchorBlock: block ?? null,
          anchoredAt: anchoredAt ? anchoredAt.getTime() : null,
        },
      },
    );
  }

  async listBatched(opts: ListOpts = {}, col: string): Promise<PageResult<BatchedRow>> {
    const { limit = 50, offset = 0 } = opts;
    const filter = buildFilter(opts);

    const total = await this.col(col).countDocuments(filter);
    const docs = await this.col(col)
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    return { rows: docs.map(docToBatchedRow), total };
  }

  async findBatchedById(id: string, col: string): Promise<BatchedRow | null> {
    const doc = await this.col(col).findOne({ _id: id });
    if (!doc) return null;
    return docToBatchedRow(doc);
  }

  async findBatchedByIdAny(id: string): Promise<{ row: BatchedRow; table: string } | null> {
    for (const t of ALL_BATCHED_TABLES) {
      const row = await this.findBatchedById(id, t);
      if (row) return { row, table: t };
    }
    return null;
  }

  async listBatchedByRoot(batchRoot: string, col: string): Promise<BatchedRow[]> {
    const docs = await this.col(col)
      .find({ batchRoot })
      .sort({ leafIndex: 1 })
      .skip(0)
      .limit(10000)
      .toArray();
    return docs.map(docToBatchedRow);
  }

  // ── benchmark helpers ───────────────────────────────────────────────────────

  async tableSizeBytes(col: string): Promise<number> {
    const db = this.client.db(config.mongodb.name) as unknown as {
      command(c: Record<string, unknown>): Promise<{ size?: number; storageSize?: number; totalIndexSize?: number }>;
    };
    try {
      const stats = await db.command({ collStats: col });
      return Number(stats.storageSize ?? stats.size ?? 0) + Number(stats.totalIndexSize ?? 0);
    } catch {
      return 0;
    }
  }

  async tamperLog(id: string, col: string): Promise<boolean> {
    const res = await this.col(col).updateOne(
      { _id: id },
      { $set: { message: '__tampered__' } },
    );
    return res.modifiedCount > 0;
  }

  async deleteLog(id: string, col: string): Promise<boolean> {
    const c = this.col(col) as unknown as { deleteOne(f: Record<string, unknown>): Promise<{ deletedCount: number }> };
    const res = await c.deleteOne({ _id: id });
    return res.deletedCount > 0;
  }

  async countByStatus(col: string, status: string): Promise<number> {
    return this.col(col).countDocuments({ anchorStatus: status });
  }

  async avgExposureWindowMs(col: string): Promise<number> {
    const c = this.col(col) as unknown as {
      aggregate(p: Array<Record<string, unknown>>): { toArray(): Promise<Array<{ ms?: number }>> };
    };
    try {
      const out = await c.aggregate([
        { $match: { anchorStatus: 'confirmed', anchoredAt: { $ne: null } } },
        { $group: { _id: null, ms: { $avg: { $subtract: ['$anchoredAt', '$createdAt'] } } } },
      ]).toArray();
      return Number(out[0]?.ms ?? 0);
    } catch {
      return 0;
    }
  }

  async listBatches(opts: ListOpts = {}, col: string): Promise<PageResult<BatchRow>> {
    const { limit = 50, offset = 0 } = opts;

    const total = await this.col(col).countDocuments({});
    const docs = await this.col(col)
      .find({})
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    return { rows: docs.map(docToBatchRow), total };
  }
}

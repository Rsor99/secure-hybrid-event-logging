import { Pool, PoolConfig } from 'pg';
import { LogEntry, LogLevel } from '../../core/LogEntry';
import { config } from '../config/env';

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

// ── exported types ────────────────────────────────────────────────────────────

export interface ListOpts {
  limit?: number;
  offset?: number;
  level?: string;
  source?: string;
  anchorStatus?: string;
  batched?: string;   // 'pending' = no batch_root | 'assigned' = has batch_root
}

export interface PageResult<T> {
  rows: T[];
  total: number;
}

export interface AnchoredRow {
  id: string;
  timestamp: Date;
  level: LogLevel;
  source: string;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  contentHash: string;
  anchorStatus: 'pending' | 'confirmed' | 'failed';
  anchorTxHash?: string;
  anchorBlock?: number;
  anchoredAt?: Date;
}

export interface BatchedRow {
  id: string;
  timestamp: Date;
  level: LogLevel;
  source: string;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  contentHash: string;
  batchRoot?: string;
  leafIndex?: number;
}

export interface BatchRow {
  merkleRoot: string;
  startId: string;
  endId: string;
  logCount: number;
  debugCount: number;
  infoCount: number;
  warnCount: number;
  errorCount: number;
  criticalCount: number;
  maxSeverity: number;
  anchorStatus: 'pending' | 'confirmed' | 'failed';
  anchorTxHash?: string;
  anchorBlock?: number;
  anchoredAt?: Date;
  createdAt: Date;
}

// ── table name constants ──────────────────────────────────────────────────────

export const TBL_OFFCHAIN         = 'logs_offchain';
export const TBL_ANCHORED_PRIVATE = 'logs_anchored_private';
export const TBL_ANCHORED_PUBLIC  = 'logs_anchored_public';
export const TBL_BATCHED_PRIVATE  = 'logs_batched_private';
export const TBL_BATCHED_PUBLIC   = 'logs_batched_public';
export const TBL_BATCHES_PRIVATE  = 'batches_private';
export const TBL_BATCHES_PUBLIC   = 'batches_public';

export const ALL_ANCHORED_TABLES = [TBL_ANCHORED_PRIVATE, TBL_ANCHORED_PUBLIC] as const;
export const ALL_BATCHED_TABLES  = [TBL_BATCHED_PRIVATE,  TBL_BATCHED_PUBLIC]  as const;
export const ALL_BATCHES_TABLES  = [TBL_BATCHES_PRIVATE,  TBL_BATCHES_PUBLIC]  as const;

// ── helpers ───────────────────────────────────────────────────────────────────

function rowToLogEntry(row: Record<string, unknown>): LogEntry {
  return new LogEntry({
    id: row.id as string,
    timestamp: new Date(Number(row.timestamp)),
    level: intToLevel(row.level as number),
    source: row.source as string,
    message: row.message as string,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  });
}

function rowToAnchoredRow(row: Record<string, unknown>): AnchoredRow {
  return {
    id: row.id as string,
    timestamp: new Date(Number(row.timestamp)),
    level: intToLevel(row.level as number),
    source: row.source as string,
    message: row.message as string,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: new Date(row.created_at as string),
    contentHash: row.content_hash as string,
    anchorStatus: (row.anchor_status as 'pending' | 'confirmed' | 'failed') ?? 'pending',
    anchorTxHash: row.anchor_tx_hash as string | undefined,
    anchorBlock: row.anchor_block != null ? Number(row.anchor_block) : undefined,
    anchoredAt: row.anchored_at ? new Date(row.anchored_at as string) : undefined,
  };
}

function rowToBatchedRow(row: Record<string, unknown>): BatchedRow {
  return {
    id: row.id as string,
    timestamp: new Date(Number(row.timestamp)),
    level: intToLevel(row.level as number),
    source: row.source as string,
    message: row.message as string,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: new Date(row.created_at as string),
    contentHash: row.content_hash as string,
    batchRoot: row.batch_root as string | undefined,
    leafIndex: row.leaf_index != null ? Number(row.leaf_index) : undefined,
  };
}

function rowToBatchRow(row: Record<string, unknown>): BatchRow {
  return {
    merkleRoot: row.merkle_root as string,
    startId: row.start_id as string,
    endId: row.end_id as string,
    logCount: Number(row.log_count),
    debugCount: Number(row.debug_count),
    infoCount: Number(row.info_count),
    warnCount: Number(row.warn_count),
    errorCount: Number(row.error_count),
    criticalCount: Number(row.critical_count),
    maxSeverity: Number(row.max_severity),
    anchorStatus: (row.anchor_status as 'pending' | 'confirmed' | 'failed') ?? 'pending',
    anchorTxHash: row.anchor_tx_hash as string | undefined,
    anchorBlock: row.anchor_block != null ? Number(row.anchor_block) : undefined,
    anchoredAt: row.anchored_at ? new Date(row.anchored_at as string) : undefined,
    createdAt: new Date(row.created_at as string),
  };
}

// ── WHERE builder ─────────────────────────────────────────────────────────────

function buildWhere(
  opts: ListOpts,
  startIndex = 1,
): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (opts.level) {
    params.push(levelToInt(opts.level));
    conditions.push(`level = $${startIndex + params.length - 1}`);
  }
  if (opts.source) {
    params.push(`%${opts.source}%`);
    conditions.push(`source ILIKE $${startIndex + params.length - 1}`);
  }
  if (opts.anchorStatus) {
    params.push(opts.anchorStatus);
    conditions.push(`anchor_status = $${startIndex + params.length - 1}`);
  }
  if (opts.batched === 'pending') {
    conditions.push('batch_root IS NULL');
  } else if (opts.batched === 'assigned') {
    conditions.push('batch_root IS NOT NULL');
  }
  return {
    clause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

// ── adapter ───────────────────────────────────────────────────────────────────

export class PostgresAdapter {
  readonly name = 'PostgreSQL';
  private pool: Pool;

  constructor() {
    const poolConfig: PoolConfig = {
      host: config.postgresql.host,
      port: config.postgresql.port,
      database: config.postgresql.name,
      user: config.postgresql.user,
      password: config.postgresql.password,
      max: config.postgresql.poolSize,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
    this.pool = new Pool(poolConfig);
  }

  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Table 1: offchain (DB-only)
      await client.query(`
        CREATE TABLE IF NOT EXISTS logs_offchain (
          id         CHAR(36) PRIMARY KEY,
          timestamp  BIGINT NOT NULL,
          level      SMALLINT NOT NULL,
          source     VARCHAR(31) NOT NULL,
          message    TEXT NOT NULL,
          metadata   JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_offchain_ts    ON logs_offchain(timestamp);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_offchain_level ON logs_offchain(level);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_offchain_src   ON logs_offchain(source);`);

      // Helper to create an anchored-style table
      const createAnchoredTable = async (tbl: string, suffix: string) => {
        await client.query(`
          CREATE TABLE IF NOT EXISTS ${tbl} (
            id             CHAR(36) PRIMARY KEY,
            timestamp      BIGINT NOT NULL,
            level          SMALLINT NOT NULL,
            source         VARCHAR(31) NOT NULL,
            message        TEXT NOT NULL,
            metadata       JSONB NOT NULL DEFAULT '{}',
            created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            content_hash   CHAR(64) NOT NULL UNIQUE,
            anchor_status  VARCHAR(20) NOT NULL DEFAULT 'pending',
            anchor_tx_hash VARCHAR(128),
            anchor_block   BIGINT,
            anchored_at    TIMESTAMPTZ
          );
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_${suffix}_ts     ON ${tbl}(timestamp);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_${suffix}_level  ON ${tbl}(level);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_${suffix}_src    ON ${tbl}(source);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_${suffix}_status ON ${tbl}(anchor_status);`);
      };

      // Helper to create a batched-style table
      const createBatchedTable = async (tbl: string, suffix: string) => {
        await client.query(`
          CREATE TABLE IF NOT EXISTS ${tbl} (
            id           CHAR(36) PRIMARY KEY,
            timestamp    BIGINT NOT NULL,
            level        SMALLINT NOT NULL,
            source       VARCHAR(31) NOT NULL,
            message      TEXT NOT NULL,
            metadata     JSONB NOT NULL DEFAULT '{}',
            created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            content_hash CHAR(64) NOT NULL UNIQUE,
            batch_root   CHAR(64),
            leaf_index   INTEGER
          );
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_${suffix}_ts         ON ${tbl}(timestamp);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_${suffix}_level      ON ${tbl}(level);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_${suffix}_src        ON ${tbl}(source);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_${suffix}_batch_root ON ${tbl}(batch_root);`);
      };

      // Helper to create a batches metadata table
      const createBatchesTable = async (tbl: string, suffix: string) => {
        await client.query(`
          CREATE TABLE IF NOT EXISTS ${tbl} (
            merkle_root    CHAR(64) PRIMARY KEY,
            start_id       CHAR(36) NOT NULL,
            end_id         CHAR(36) NOT NULL,
            log_count      INTEGER NOT NULL,
            debug_count    INTEGER NOT NULL DEFAULT 0,
            info_count     INTEGER NOT NULL DEFAULT 0,
            warn_count     INTEGER NOT NULL DEFAULT 0,
            error_count    INTEGER NOT NULL DEFAULT 0,
            critical_count INTEGER NOT NULL DEFAULT 0,
            max_severity   SMALLINT NOT NULL,
            anchor_status  VARCHAR(20) NOT NULL DEFAULT 'pending',
            anchor_tx_hash VARCHAR(128),
            anchor_block   BIGINT,
            anchored_at    TIMESTAMPTZ,
            created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_${suffix}_status ON ${tbl}(anchor_status);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_${suffix}_ts     ON ${tbl}(created_at);`);
      };

      // Tables 2–3: anchored (private = Exonum, public = Ethereum)
      await createAnchoredTable(TBL_ANCHORED_PRIVATE, 'anchored_private');
      await createAnchoredTable(TBL_ANCHORED_PUBLIC,  'anchored_public');

      // Tables 4–5: batched leaves (private = Exonum, public = Ethereum)
      await createBatchedTable(TBL_BATCHED_PRIVATE, 'batched_private');
      await createBatchedTable(TBL_BATCHED_PUBLIC,  'batched_public');

      // Tables 6–7: batch metadata
      await createBatchesTable(TBL_BATCHES_PRIVATE, 'batches_private');
      await createBatchesTable(TBL_BATCHES_PUBLIC,  'batches_public');
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async dropAll(): Promise<void> {
    await this.pool.query(`
      DROP TABLE IF EXISTS logs_batched_private  CASCADE;
      DROP TABLE IF EXISTS logs_batched_public   CASCADE;
      DROP TABLE IF EXISTS batches_private       CASCADE;
      DROP TABLE IF EXISTS batches_public        CASCADE;
      DROP TABLE IF EXISTS logs_anchored_private CASCADE;
      DROP TABLE IF EXISTS logs_anchored_public  CASCADE;
      DROP TABLE IF EXISTS logs_offchain         CASCADE;
      DROP TABLE IF EXISTS logs_batched          CASCADE;
      DROP TABLE IF EXISTS batches               CASCADE;
      DROP TABLE IF EXISTS logs_anchored         CASCADE;
      DROP TABLE IF EXISTS logs                  CASCADE;
    `);
  }

  // ── offchain ────────────────────────────────────────────────────────────────

  async insertOffchain(log: LogEntry): Promise<void> {
    await this.pool.query(
      `INSERT INTO logs_offchain (id, timestamp, level, source, message, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        log.id,
        log.timestamp.getTime(),
        levelToInt(log.level),
        log.source,
        log.message,
        JSON.stringify(log.metadata),
      ],
    );
  }

  async findOffchainById(id: string): Promise<LogEntry | null> {
    const res = await this.pool.query('SELECT * FROM logs_offchain WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return rowToLogEntry(res.rows[0]);
  }

  async listOffchain(opts: ListOpts = {}): Promise<PageResult<LogEntry>> {
    const { limit = 50, offset = 0 } = opts;
    const { clause, params } = buildWhere(opts);

    const countRes = await this.pool.query(
      `SELECT COUNT(*) FROM logs_offchain ${clause}`,
      params,
    );
    const total = Number(countRes.rows[0].count);

    const dataParams = [...params, limit, offset];
    const dataRes = await this.pool.query(
      `SELECT * FROM logs_offchain ${clause} ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      dataParams,
    );

    return { rows: dataRes.rows.map(rowToLogEntry), total };
  }

  // ── anchored ────────────────────────────────────────────────────────────────

  async insertAnchored(log: LogEntry, contentHash: string, table: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO ${table} (id, timestamp, level, source, message, metadata, content_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        log.id,
        log.timestamp.getTime(),
        levelToInt(log.level),
        log.source,
        log.message,
        JSON.stringify(log.metadata),
        contentHash,
      ],
    );
  }

  async updateAnchorStatus(
    id: string,
    status: string,
    txHash: string | undefined,
    block: number | undefined,
    anchoredAt: Date | undefined,
    table: string,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE ${table}
       SET anchor_status = $1, anchor_tx_hash = $2, anchor_block = $3, anchored_at = $4
       WHERE id = $5`,
      [status, txHash ?? null, block ?? null, anchoredAt ?? null, id],
    );
  }

  async listAnchored(opts: ListOpts = {}, table: string): Promise<PageResult<AnchoredRow>> {
    const { limit = 50, offset = 0 } = opts;
    const { clause, params } = buildWhere(opts);

    const countRes = await this.pool.query(
      `SELECT COUNT(*) FROM ${table} ${clause}`,
      params,
    );
    const total = Number(countRes.rows[0].count);

    const dataParams = [...params, limit, offset];
    const dataRes = await this.pool.query(
      `SELECT * FROM ${table} ${clause} ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      dataParams,
    );

    return { rows: dataRes.rows.map(rowToAnchoredRow), total };
  }

  async findAnchoredById(id: string, table: string): Promise<AnchoredRow | null> {
    const res = await this.pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    if (res.rows.length === 0) return null;
    return rowToAnchoredRow(res.rows[0]);
  }

  async findAnchoredByHash(contentHash: string, table: string): Promise<AnchoredRow | null> {
    const res = await this.pool.query(`SELECT * FROM ${table} WHERE content_hash = $1 LIMIT 1`, [contentHash]);
    if (res.rows.length === 0) return null;
    return rowToAnchoredRow(res.rows[0]);
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

  async insertBatched(log: LogEntry, contentHash: string, table: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO ${table} (id, timestamp, level, source, message, metadata, content_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        log.id,
        log.timestamp.getTime(),
        levelToInt(log.level),
        log.source,
        log.message,
        JSON.stringify(log.metadata),
        contentHash,
      ],
    );
  }

  async insertBatchRecord(meta: BatchRow, table: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO ${table}
         (merkle_root, start_id, end_id, log_count,
          debug_count, info_count, warn_count, error_count, critical_count,
          max_severity, anchor_status, anchor_tx_hash, anchor_block, anchored_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (merkle_root) DO NOTHING`,
      [
        meta.merkleRoot,
        meta.startId,
        meta.endId,
        meta.logCount,
        meta.debugCount,
        meta.infoCount,
        meta.warnCount,
        meta.errorCount,
        meta.criticalCount,
        meta.maxSeverity,
        meta.anchorStatus,
        meta.anchorTxHash ?? null,
        meta.anchorBlock ?? null,
        meta.anchoredAt ?? null,
      ],
    );
  }

  async linkBatchLeaves(ids: string[], merkleRoot: string, table: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < ids.length; i++) {
        await client.query(
          `UPDATE ${table} SET batch_root = $1, leaf_index = $2 WHERE id = $3`,
          [merkleRoot, i, ids[i]],
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateBatchAnchorStatus(
    merkleRoot: string,
    status: string,
    txHash: string | undefined,
    block: number | undefined,
    anchoredAt: Date | undefined,
    table: string,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE ${table}
       SET anchor_status = $1, anchor_tx_hash = $2, anchor_block = $3, anchored_at = $4
       WHERE merkle_root = $5`,
      [status, txHash ?? null, block ?? null, anchoredAt ?? null, merkleRoot],
    );
  }

  async listBatched(opts: ListOpts = {}, table: string): Promise<PageResult<BatchedRow>> {
    const { limit = 50, offset = 0 } = opts;
    const { clause, params } = buildWhere(opts);

    const countRes = await this.pool.query(
      `SELECT COUNT(*) FROM ${table} ${clause}`,
      params,
    );
    const total = Number(countRes.rows[0].count);

    const dataParams = [...params, limit, offset];
    const dataRes = await this.pool.query(
      `SELECT * FROM ${table} ${clause} ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      dataParams,
    );

    return { rows: dataRes.rows.map(rowToBatchedRow), total };
  }

  async findBatchedById(id: string, table: string): Promise<BatchedRow | null> {
    const res = await this.pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    return res.rows.length ? rowToBatchedRow(res.rows[0]) : null;
  }

  async findBatchedByIdAny(id: string): Promise<{ row: BatchedRow; table: string } | null> {
    for (const t of ALL_BATCHED_TABLES) {
      const row = await this.findBatchedById(id, t);
      if (row) return { row, table: t };
    }
    return null;
  }

  async listBatchedByRoot(batchRoot: string, table: string): Promise<BatchedRow[]> {
    const res = await this.pool.query(
      `SELECT * FROM ${table} WHERE batch_root = $1 ORDER BY leaf_index ASC`,
      [batchRoot],
    );
    return res.rows.map(rowToBatchedRow);
  }

  // ── benchmark helpers ───────────────────────────────────────────────────────

  async tableSizeBytes(table: string): Promise<number> {
    const res = await this.pool.query(`SELECT pg_total_relation_size($1) AS bytes`, [table]);
    return Number(res.rows[0]?.bytes ?? 0);
  }

  async tamperLog(id: string, table: string): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE ${table} SET message = message || ' [tampered]' WHERE id = $1`,
      [id],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async deleteLog(id: string, table: string): Promise<boolean> {
    const res = await this.pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async countByStatus(table: string, status: string): Promise<number> {
    const res = await this.pool.query(
      `SELECT COUNT(*)::int AS n FROM ${table} WHERE anchor_status = $1`,
      [status],
    );
    return Number(res.rows[0]?.n ?? 0);
  }

  // Avg(anchored_at - created_at) in ms, over rows that have actually been confirmed.
  // Used as the integrity-exposure-window metric for anchored / batched leaf tables.
  async avgExposureWindowMs(table: string): Promise<number> {
    const res = await this.pool.query(
      `SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (anchored_at - created_at)) * 1000), 0) AS ms
       FROM ${table}
       WHERE anchor_status = 'confirmed' AND anchored_at IS NOT NULL`,
    );
    return Number(res.rows[0]?.ms ?? 0);
  }

  async listBatches(opts: ListOpts = {}, table: string): Promise<PageResult<BatchRow>> {
    const { limit = 50, offset = 0 } = opts;

    const countRes = await this.pool.query(`SELECT COUNT(*) FROM ${table}`);
    const total = Number(countRes.rows[0].count);

    const dataRes = await this.pool.query(
      `SELECT * FROM ${table} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    return { rows: dataRes.rows.map(rowToBatchRow), total };
  }
}

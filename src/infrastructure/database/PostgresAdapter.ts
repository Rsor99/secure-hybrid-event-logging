import { Pool, PoolConfig } from 'pg';
import { LogEntry, LogLevel } from '../../core/LogEntry';
import { config } from '../config/env';

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
      await client.query(`
        CREATE TABLE IF NOT EXISTS logs (
          id VARCHAR(36) PRIMARY KEY,
          timestamp TIMESTAMPTZ NOT NULL,
          level VARCHAR(10) NOT NULL,
          source VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          metadata JSON DEFAULT '{}',
          data_hash VARCHAR(64) NOT NULL,
          blockchain_tx_id VARCHAR(128),
          blockchain_confirmed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(source);
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_logs_blockchain_tx ON logs(blockchain_tx_id);
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_logs_data_hash ON logs(data_hash);
      `);
      // Migrate existing JSONB metadata column to JSON to preserve key insertion order
      await client.query(`
        DO $$ BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='logs' AND column_name='metadata' AND data_type='jsonb'
          ) THEN
            ALTER TABLE logs ALTER COLUMN metadata TYPE JSON USING metadata::TEXT::JSON;
          END IF;
        END $$;
      `);
    } finally {
      client.release();
    }
  }

  async insert(log: LogEntry): Promise<void> {
    await this.pool.query(
      `INSERT INTO logs (id, timestamp, level, source, message, metadata, data_hash, blockchain_tx_id, blockchain_confirmed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        log.id,
        log.timestamp,
        log.level,
        log.source,
        log.message,
        JSON.stringify(log.metadata),
        log.dataHash,
        log.blockchainTxId,
        log.blockchainConfirmed,
      ]
    );
  }

  async insertBatch(logs: LogEntry[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const log of logs) {
        await client.query(
          `INSERT INTO logs (id, timestamp, level, source, message, metadata, data_hash, blockchain_tx_id, blockchain_confirmed)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            log.id,
            log.timestamp,
            log.level,
            log.source,
            log.message,
            JSON.stringify(log.metadata),
            log.dataHash,
            log.blockchainTxId,
            log.blockchainConfirmed,
          ]
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

  async findMany(opts: {
    limit?: number;
    offset?: number;
    level?: string;
    source?: string;
  } = {}): Promise<LogEntry[]> {
    const { limit = 50, offset = 0, level, source } = opts;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (level) { params.push(level); conditions.push(`level = $${params.length}`); }
    if (source) { params.push(`%${source}%`); conditions.push(`source ILIKE $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);
    const sql = `SELECT * FROM logs ${where} ORDER BY timestamp DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await this.pool.query(sql, params);
    return result.rows.map(row => new LogEntry({
      id: row.id,
      timestamp: new Date(row.timestamp),
      level: row.level as LogLevel,
      source: row.source,
      message: row.message,
      metadata: row.metadata,
      dataHash: row.data_hash,
      blockchainTxId: row.blockchain_tx_id,
      blockchainConfirmed: row.blockchain_confirmed,
    }));
  }

  async findById(id: string): Promise<LogEntry | null> {
    const result = await this.pool.query('SELECT * FROM logs WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return new LogEntry({
      id: row.id,
      timestamp: new Date(row.timestamp),
      level: row.level as LogLevel,
      source: row.source,
      message: row.message,
      metadata: row.metadata,
      dataHash: row.data_hash,
      blockchainTxId: row.blockchain_tx_id,
      blockchainConfirmed: row.blockchain_confirmed,
    });
  }

  async findByHash(dataHash: string): Promise<LogEntry | null> {
    const result = await this.pool.query('SELECT * FROM logs WHERE data_hash = $1 LIMIT 1', [dataHash]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return new LogEntry({
      id: row.id,
      timestamp: new Date(row.timestamp),
      level: row.level as LogLevel,
      source: row.source,
      message: row.message,
      metadata: row.metadata,
      dataHash: row.data_hash,
      blockchainTxId: row.blockchain_tx_id,
      blockchainConfirmed: row.blockchain_confirmed,
    });
  }

  async updateBlockchainInfo(id: string, txId: string, confirmed: boolean): Promise<void> {
    await this.pool.query(
      'UPDATE logs SET blockchain_tx_id = $1, blockchain_confirmed = $2 WHERE id = $3',
      [txId, confirmed, id]
    );
  }

  async tamperRecord(id: string, newMessage: string): Promise<boolean> {
    const result = await this.pool.query(
      'UPDATE logs SET message = $1 WHERE id = $2',
      [newMessage, id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

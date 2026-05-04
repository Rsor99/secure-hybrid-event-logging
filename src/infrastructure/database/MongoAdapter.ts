import { LogEntry, LogLevel } from '../../core/LogEntry';
import { config } from '../config/env';

interface MongoDoc extends Record<string, unknown> {}

interface IMongoCollection {
  createIndex(spec: Record<string, number>): Promise<unknown>;
  insertOne(doc: MongoDoc): Promise<unknown>;
  insertMany(docs: MongoDoc[], opts?: { ordered: boolean }): Promise<unknown>;
  findOne(filter: Record<string, unknown>): Promise<MongoDoc | null>;
  updateOne(
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
  new (uri: string, opts?: Record<string, unknown>): IMongoClient;
}

let MongoClientCtor: IMongoClientCtor | undefined;

try {
  const mod = require('mongodb') as { MongoClient: IMongoClientCtor };
  MongoClientCtor = mod.MongoClient;
} catch {
  // mongodb is an optional dependency
}

export class MongoAdapter {
  readonly name = 'MongoDB';
  private client!: IMongoClient;
  private collection!: IMongoCollection;

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
    const db: IMongoDb = this.client.db(config.mongodb.name);
    this.collection = db.collection('logs');

    await this.collection.createIndex({ timestamp: 1 });
    await this.collection.createIndex({ level: 1 });
    await this.collection.createIndex({ source: 1 });
    await this.collection.createIndex({ blockchain_tx_id: 1 });
  }

  async insert(log: LogEntry): Promise<void> {
    await this.collection.insertOne({
      _id: log.id,
      timestamp: log.timestamp,
      level: log.level,
      source: log.source,
      message: log.message,
      metadata: log.metadata,
      data_hash: log.dataHash,
      blockchain_tx_id: log.blockchainTxId,
      blockchain_confirmed: log.blockchainConfirmed,
    });
  }

  async insertBatch(logs: LogEntry[]): Promise<void> {
    const docs: MongoDoc[] = logs.map((log) => ({
      _id: log.id,
      timestamp: log.timestamp,
      level: log.level,
      source: log.source,
      message: log.message,
      metadata: log.metadata,
      data_hash: log.dataHash,
      blockchain_tx_id: log.blockchainTxId,
      blockchain_confirmed: log.blockchainConfirmed,
    }));
    await this.collection.insertMany(docs, { ordered: false });
  }

  async findById(id: string): Promise<LogEntry | null> {
    const doc = await this.collection.findOne({ _id: id });
    if (!doc) return null;
    return new LogEntry({
      id: String(doc._id),
      timestamp: new Date(doc.timestamp as string),
      level: doc.level as LogLevel,
      source: doc.source as string,
      message: doc.message as string,
      metadata: doc.metadata as Record<string, unknown>,
      dataHash: doc.data_hash as string,
      blockchainTxId: doc.blockchain_tx_id as string | undefined,
      blockchainConfirmed: doc.blockchain_confirmed as boolean | undefined,
    });
  }

  async updateBlockchainInfo(id: string, txId: string, confirmed: boolean): Promise<void> {
    await this.collection.updateOne(
      { _id: id },
      { $set: { blockchain_tx_id: txId, blockchain_confirmed: confirmed } },
    );
  }

  async tamperRecord(id: string, newMessage: string): Promise<boolean> {
    const result = await this.collection.updateOne(
      { _id: id },
      { $set: { message: newMessage } },
    );
    return result.modifiedCount > 0;
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

export enum WriteMode {
  SYNC = 'sync',
  ASYNC = 'async',
  BATCH = 'batch',
}

export enum LogStrategy {
  DATABASE_ONLY = 'database_only',
  PRIVATE_CHAIN = 'private_chain',
  PUBLIC_CHAIN = 'public_chain',
  HYBRID_PRIVATE = 'hybrid_private',
  HYBRID_PUBLIC = 'hybrid_public',
}

export enum DatabaseType {
  POSTGRESQL = 'postgresql',
  MONGODB = 'mongodb',
}

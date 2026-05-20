export enum WriteMode {
  SYNC = 'sync',
  ASYNC = 'async',
  BATCH = 'batch',
}

export enum LogStrategy {
  DATABASE_ONLY        = 'database_only',
  PRIVATE_CHAIN        = 'private_chain',
  PUBLIC_CHAIN         = 'public_chain',
  HYBRID_PRIVATE       = 'hybrid_private',
  HYBRID_PRIVATE_BATCH = 'hybrid_private_batch',
  HYBRID_PUBLIC        = 'hybrid_public',
  HYBRID_PUBLIC_BATCH  = 'hybrid_public_batch',
}

export enum DatabaseType {
  POSTGRESQL = 'postgresql',
  MONGODB = 'mongodb',
}

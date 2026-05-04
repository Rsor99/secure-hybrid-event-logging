import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// ── helpers ───────────────────────────────────────────────────────────────────

function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function optionalInt(key: string, fallback: number): number {
  const v = process.env[key];
  return v ? parseInt(v, 10) : fallback;
}

// ── config ────────────────────────────────────────────────────────────────────

export const config = {
  port:    optionalInt("PORT", 3000),
  nodeEnv: optional("NODE_ENV", "development"),

  postgresql: {
    host:     required("PG_HOST"),
    port:     optionalInt("PG_PORT", 5432),
    name:     required("PG_NAME"),
    user:     required("PG_USER"),
    password: required("PG_PASSWORD"),
    poolSize: optionalInt("PG_POOL_SIZE", 20),
  },

  mongodb: {
    uri:      required("MONGO_URI"),
    name:     required("MONGO_DB_NAME"),
    poolSize: optionalInt("MONGO_POOL_SIZE", 20),
  },

  ethereum: {
    rpcUrl:             required("ETH_RPC_URL"),
    privateKey:         required("ETH_PRIVATE_KEY"),
    logContract:        required("ETH_LOG_CONTRACT"),
    hashContract:       required("ETH_HASH_CONTRACT"),
    batchContract:      required("ETH_BATCH_CONTRACT"),
    confirmationBlocks: optionalInt("ETH_CONFIRMATION_BLOCKS", 3),
  },

  exonum: {
    nodeUrl:         required("EXONUM_NODE_URL"),
    publicKey:       required("EXONUM_PUBLIC_KEY"),
    secretKey:       required("EXONUM_SECRET_KEY"),
    logServiceId:    optionalInt("EXONUM_LOG_SERVICE_ID",   100),
    logServiceName:  optional("EXONUM_LOG_SERVICE_NAME",   "log-service"),
    hashServiceId:   optionalInt("EXONUM_HASH_SERVICE_ID",  101),
    hashServiceName: optional("EXONUM_HASH_SERVICE_NAME",  "hash-service"),
    batchServiceId:  optionalInt("EXONUM_BATCH_SERVICE_ID", 102),
    batchServiceName:optional("EXONUM_BATCH_SERVICE_NAME", "batch-service"),
  },

  exportDir: optional("EXPORT_DIR", "./results"),
};

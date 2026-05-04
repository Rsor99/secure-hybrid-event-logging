# Secure Hybrid Event Logging Benchmark

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Type](https://img.shields.io/badge/type-research-blue)](.)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](.)
[![Blockchain](https://img.shields.io/badge/blockchain-Ethereum%20%7C%20Exonum-purple)](.)

A research-grade benchmark comparing five event-logging storage strategies across two databases (PostgreSQL, MongoDB) and two blockchains (Ethereum Sepolia, Exonum private chain). The project measures write throughput, read latency, and system overhead to evaluate the trade-offs of adding blockchain integrity anchoring to a traditional logging pipeline.

---

## What It Does

The system logs structured events and stores them in one of five configurable strategies:

| Strategy | Storage | Description |
|---|---|---|
| `db_only` | PostgreSQL or MongoDB | Baseline — logs written to database only |
| `private_chain` | Exonum only | Full log (message + metadata) stored on-chain |
| `hybrid_private` | DB + Exonum | Full log in DB; SHA-256 hash anchored to Exonum |
| `hybrid_private_batch` | DB + Exonum | Full log in DB; batch Merkle root anchored to Exonum |
| `hybrid_public` | DB + Ethereum | Full log in DB; SHA-256 hash anchored to Ethereum Sepolia |

Each log entry is hashed using canonical SHA-256 (fixed field order, no whitespace JSON) before any blockchain interaction, so data integrity can always be verified independently.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Express API  (POST /log · GET /logs · POST /verify)    │
└───────────────────┬─────────────────────────────────────┘
                    │ storageMode
        ┌───────────┴───────────┐
        ▼                       ▼
  DatabaseStorage          BlockchainAnchor
  (PostgreSQL / MongoDB)   (EthereumAnchor / ExonumAnchor)
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
             Ethereum Sepolia       Exonum Private Chain
             LogStore.sol           LogService (ID 100)
             HashStore.sol          HashService (ID 101)
             BatchStore.sol         BatchService (ID 102)
```

**Three Ethereum contracts** (each independently deployable):
- `LogStore` — stores full log with `uint8` level, `bytes32` source, message, metadata, SHA-256 history chain
- `HashStore` — stores SHA-256 content hash only (lightweight anchor)
- `BatchStore` — stores Merkle root of a batch with summary counts

**Three Exonum services** with uniform `write` / `info` / `list` API:
- `LogService` — writes full log record to MerkleDB with Merkle proof
- `HashService` — writes single hash anchor with Merkle proof
- `BatchService` — writes batch Merkle root with Merkle proof

---

## Write Modes

| Mode | Behavior |
|------|----------|
| **Sync** | Wait for blockchain confirmation before returning |
| **Async** | Submit to blockchain in background; return immediately |
| **Batch** | Accumulate 10 logs; flush as single Merkle root |

---

## Benchmark Experiments

Eight experiments run via `npm run experiment:all-24` (or individually):

```bash
npm run exp:db-postgres          # PostgreSQL only
npm run exp:db-mongo             # MongoDB only
npm run exp:chain-ethereum       # Ethereum Sepolia only
npm run exp:chain-exonum         # Exonum private chain only
npm run exp:hybrid-pg-ethereum   # PostgreSQL + Ethereum
npm run exp:hybrid-pg-exonum     # PostgreSQL + Exonum
npm run exp:hybrid-mongo-ethereum
npm run exp:hybrid-mongo-exonum
```

Each experiment measures: throughput (ops/sec), p50/p95/p99 latency, CPU usage, memory usage. Results export to `./results/` as CSV and JSON.

---

## Prerequisites

- Node.js 18+
- Docker and Docker Compose
- An Ethereum Sepolia RPC endpoint and funded wallet

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — fill in PG_PASSWORD, ETH_PRIVATE_KEY, contract addresses, etc.

# 3. Start databases
docker compose -f docker-compose.db.yml up -d

# 4. Run database migrations
npm run migrate postgresql
npm run migrate mongodb

# 5. (Optional) Start Exonum private chain
cd exonum-logstore && docker compose up -d

# 6. Deploy Ethereum contracts (Sepolia)
npx hardhat run scripts/deploy.js --network sepolia

# 7. Start the API server
npm run dev
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PG_HOST`, `PG_NAME`, `PG_USER`, `PG_PASSWORD` | Yes | PostgreSQL connection |
| `MONGO_URI`, `MONGO_DB_NAME` | Yes | MongoDB connection |
| `ETH_RPC_URL`, `ETH_PRIVATE_KEY` | Yes | Ethereum wallet + RPC |
| `ETH_LOG_CONTRACT`, `ETH_HASH_CONTRACT`, `ETH_BATCH_CONTRACT` | Yes | Deployed contract addresses |
| `EXONUM_NODE_URL`, `EXONUM_PUBLIC_KEY`, `EXONUM_SECRET_KEY` | Yes | Exonum node access |
| `PORT` | No (default 3000) | API server port |
| `EXPORT_DIR` | No (default `./results`) | Benchmark output directory |

---

## API Endpoints

```
POST /log              Submit a log entry (body: { level, source, message, metadata, storageMode, writeMode })
GET  /logs             List logs from database (query: level, source, limit, offset)
POST /verify           Verify a log's integrity against blockchain
GET  /chain/logs       Browse full logs stored on Exonum
GET  /chain/hashes     Browse hash anchors stored on Exonum
GET  /chain/batches    Browse batch Merkle roots stored on Exonum
```

---

## Frontend

A Vue 3 + Vite SPA at `hybrid-logging-frontend/` provides:
- **Send Log** — submit events with configurable storage strategy and write mode
- **Logs List** — browse and filter logs from PostgreSQL
- **Verify Log** — check a log's hash against the blockchain

The Exonum chain explorer at `exonum-logstore/frontend/` provides Merkle proof verification for records stored on the private chain.

---

## Hash Integrity

All content hashes use **SHA-256** throughout — no keccak-256 mixing:
- Content hash: `SHA-256(canonicalJSON(logEntry))` where canonical JSON has fixed field order `{id, timestamp, level, source, message, metadata}`
- Batch Merkle tree: binary SHA-256 tree, last node duplicated if count is odd
- Per-submitter history chain: `SHA-256(abi.encode(prevHistoryHash, contentHash))`

---

## License

MIT — see [LICENSE](LICENSE)

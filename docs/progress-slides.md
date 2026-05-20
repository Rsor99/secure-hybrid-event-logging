---
marp: true
theme: default
paginate: true
---

# Secure Hybrid Event Logging
## Progress Update

**ความก้าวหน้าโครงงาน — รายงานต่ออาจารย์**

วันที่: 2026-05-05

---

## Agenda

### 1️⃣ สิ่งที่เสร็จแล้ว
- System architecture + การเชื่อมต่อ
- 7 storage strategies × 3 write modes (24 cells)
- Async queue + confirm queue
- Tamper test + 8 quantitative metrics
- Web UI สำหรับรัน experiment + export report

### 2️⃣ ที่เหลือ
- รันทดสอบจริง
- เก็บผล + วิเคราะห์
- เขียนเล่ม

---

# 1️⃣ ส่วนที่เสร็จแล้ว

---

## System Architecture

```
┌──────────────────────── Browser ────────────────────────┐
│                                                         │
└──┬────────────────────┬──────────────────────┬──────────┘
   │ :5173              │ :8080                │ :5500
┌──▼─────────────┐  ┌───▼──────────────┐  ┌────▼─────────┐
│ Hybrid Logging │  │  Exonum Explorer │  │  Sepolia     │
│ (Vue)          │  │  (Vue)           │  │  Explorer    │
│ Send / Verify  │  │  Block / Tx /    │  │  (Static)    │
│ Experiments    │  │  Hash / Batch    │  │              │
└──────┬─────────┘  └────┬─────────┬───┘  └──────┬───────┘
       │                  │ /api    │ /node-api  │
       │ HTTP/REST        │         │            │ HTTPS
       │                  │         │            │
┌──────▼──────────────────┼─────────▼─────┐      │
│   Application :3000     │               │      │
│   Node.js / Express     │               │      │
└─┬────┬────┬─────┬───────┘               │      │
  │PG  │Mgo │MQ   │ Web3 (ethers.js)      │      │
  │    │    │     │ JSON-RPC              │      │
┌─▼─┐┌─▼─┐┌─▼──┐ ┌▼──────────────────┐  ┌─▼──────▼─────┐
│PG ││Mgo││MQ  │ │ Sepolia ETH Testnet│  │ Exonum Chain │
└───┘└───┘└────┘ │ (LogStore +        │  │ Node 0/1/2   │
                 │  HashStore +       │  │ (Rust)       │
                 │  BatchStore)       │  │              │
                 └────────────────────┘  └──────────────┘
```

---

## Components & Protocols

| Component | Tech | Port | คุยกับใคร / โปรโตคอล |
|---|---|---|---|
| **Hybrid Logging FE** | Vue 3 + Vite | 5173 | → App (HTTP REST `/log`, `/verify`, `/experiment`, `/logs/*`) |
| **Exonum Explorer FE** | Vue 2 | 8080 | → Exonum (`/api/*` HTTP) + → App (`/node-api/*`) |
| **Sepolia Explorer** | Static HTML | 5500 | → Sepolia RPC (JSON-RPC) + Etherscan API |
| **Application** | Node.js Express + TS | 3000 | กลางทุกอย่าง |
| **PostgreSQL** | pg 16 | 5432 | App ↔ TCP/SQL |
| **MongoDB** | mongo 7 | 27017 | App ↔ TCP/BSON |
| **RabbitMQ** | rabbit 3.13 | 5672 | App ↔ AMQP 0.9.1 |
| **Exonum nodes** | Rust + actix | 8000–8002 | App → HTTP (custom protobuf tx) |
| **Sepolia chain** | Geth fork (testnet) | — | App → JSON-RPC (ethers.js v6) |

---

## 7 Storage Strategies

| # | Strategy | Off-chain | On-chain | ใช้ทำอะไร |
|---|---|---|---|---|
| 1 | `database_only` | logs_offchain | — | Baseline: DB ปกติ ไม่มี anchor |
| 2 | `private_chain` | — | Exonum (full log) | Full log บน Exonum |
| 3 | `public_chain` | — | Sepolia (full log) | Full log บน Ethereum |
| 4 | `hybrid_private` | logs_anchored_private | Exonum hash | DB เก็บ log + hash บน chain |
| 5 | `hybrid_public` | logs_anchored_public | Sepolia hash | DB + Ethereum hash |
| 6 | `hybrid_private_batch` | logs_batched_private + batches_private | Exonum Merkle root | Merkle batch บน Exonum |
| 7 | `hybrid_public_batch` | logs_batched_public + batches_public | Sepolia Merkle root | Merkle batch บน Sepolia |

---

## 3 Write Modes

### Sync
HTTP request รอจน DB write + chain confirm ครบ → 200 OK

### Async (true async via RabbitMQ)
1. POST `/log` → publish เข้า `logs.<strategy>` queue → 202 Accepted ทันที
2. Subscriber ใน background: insert DB → submit chain (no wait) → publish เข้า `confirm.<strategy>` queue
3. Confirm handler: poll chain ทุก 2s × 60 ครั้ง (max 2 นาที) → update DB anchor_status = `pending → confirmed/failed`

### Batch
1. HTTP request → push เข้า BatchWriter buffer → รอจน flush
2. Flush trigger: buffer ≥ batchSize **OR** 1000ms ผ่านไปจาก write แรก
3. Flush: insert DB ทั้ง batch → submit 1 tx ต่อ batch (Merkle root) → return Promise resolve
4. Frontend รอ DB write เสร็จ ตอน chain confirm → confirm queue ดูแลต่อ

---

## Hash Anchor vs Merkle Batch

### Hash Anchor (single anchor)
ทุก log → 1 SHA-256 hash → 1 chain transaction
```
log A  →  hash(A)  →  tx1 on-chain
log B  →  hash(B)  →  tx2 on-chain
log C  →  hash(C)  →  tx3 on-chain
```
- **N logs = N transactions** → ค่า gas / fee สูง
- **ใช้กับ:** `hybrid_private`, `hybrid_public`

---

## Hash Anchor vs Merkle Batch (cont.)

### Merkle Batch
N logs → 1 Merkle root → 1 chain transaction
```
        root (anchored)
       /    \
     ab      cd
    /  \    /  \
 hA  hB  hC  hD
  ↑   ↑   ↑   ↑
  log A B C D (off-chain leaves)
```
- คำนวณ binary Merkle tree (SHA-256, ขวา-ซ้าย ต่อกัน, leaf คี่ duplicate)
- **N logs = 1 transaction** → ลด gas เหลือ ~1/N
- Verify: recompute hash จาก DB → recompute root → เทียบกับ root บน chain
- **ใช้กับ:** `hybrid_private_batch`, `hybrid_public_batch`

---

## RabbitMQ Queue Architecture

12 durable queues = 6 strategies × 2 phases

**Submit queues (รับงานเขียน)**
```
logs.private_chain
logs.public_chain
logs.hybrid_private
logs.hybrid_public
logs.hybrid_private_batch
logs.hybrid_public_batch
```

**Confirm queues (รับงานเช็ค tx confirmation)**
```
confirm.private_chain
confirm.public_chain
confirm.hybrid_private
confirm.hybrid_public
confirm.hybrid_private_batch
confirm.hybrid_public_batch
```

→ ทำให้ async = **return ทันที** + chain confirmation ทำใน background ไม่ block HTTP

---

## 8 Quantitative Metrics

| # | Metric | หน่วย | วัดยังไง |
|---|---|---|---|
| 1 | Throughput | logs/s | `successCount / totalDurationMs × 1000` |
| 2 | E2E Response Time | ms | per-write `Date.now() - writeStart` → avg / p50 / p95 / p99 |
| 3 | BC Confirmation Time | ms | confirm queue handler บันทึก `Date.now() - enqueuedAt` |
| 4 | Hash Anchoring Delay | ms | DB write done → chain submit done (ใน HybridStorage) |
| 5 | Hash Verification Time | ms | verify 10 random samples → avg |
| 6 | Storage Overhead | bytes | `pg_total_relation_size()` / Mongo `collStats` |
| 7 | Tamper Detection Rate | % | tampered N rows → verify → count detected/N |
| 8 | Integrity Exposure Window | ms | `AVG(anchored_at - created_at)` ของ confirmed rows |

---

## Tamper Test Methodology

### หลักการ
1. รัน benchmark เสร็จ → เลือก random N% ของ logs ที่เขียนสำเร็จ (default 10%)
2. UPDATE `message` ของ row นั้นในตาราง (จำ id + before/after ไว้)
3. เรียก `/verify/:id` ทุกอันที่ tamper
4. นับผล:
   - `valid: false` → **detected ✓** (รู้ว่าโดน tamper)
   - `valid: true` → **undetected ✗** (ไม่รู้)
5. Detection rate = detected / tampered × 100%

### ผลที่คาดไว้ตาม strategy
| Strategy | Mechanism | Detection |
|---|---|---|
| `database_only` | UPDATE row, ไม่มี hash check | **0%** |
| `hybrid_*` | UPDATE row, recomputed hash mismatch | **~100%** |
| `hybrid_*_batch` | UPDATE row, Merkle leaf mismatch | **~100%** |
| `private/public_chain` | Chain immutable — แก้ไม่ได้ | **100% by design** |

---

## Tamper Test UI

หน้า Experiments เลือก cells ใดก็ได้ (ไม่ต้องครบ 24)
- ตั้ง **Tamper %** (default 10%)
- กดดู row ใน Results → expand ขยาย แสดง:
  - id ของ log ที่โดน tamper
  - **before** message (สีแดง)
  - **after** message (สีเขียว)
  - ✓ Detected / ✗ Missed / N/A — chain immutable
  - verify details จาก backend

→ พิสูจน์ได้ว่า strategy ไหนตรวจ tamper ได้/ไม่ได้

---

## 24-Cell Test Matrix

8 architectures × 3 modes:

```
                    sync  async  batch
db_only / PG          ●     ●      ●
db_only / Mongo       ●     ●      ●
private_chain         ●     ●      ●
public_chain          ●     ●      ●
hybrid_private / PG   ●     ●      ●  ← batch auto-promotes
hybrid_private / Mg   ●     ●      ●     to *_batch (Merkle)
hybrid_public  / PG   ●     ●      ●
hybrid_public  / Mg   ●     ●      ●
```

**24 cells** วัด 8 metrics × 24 = 192 ค่า ต่อ 1 รอบ run

---

## Web UI — Experiments Page

### Cell Picker Table
- Checkbox เลือก cells ที่อยากรัน (ไม่ต้องครบ 24)
- Quick select: All / None / Sync / Async / Batch
- **Backend column** แสดง:
  - DB-only → DB pill (PG/Mongo)
  - Chain-only → Chain pill (Exonum/Ethereum)
  - Hybrid → DB pill + Chain pill
- **Batch Size** column: input เฉพาะ batch row (required)

### Controls
- **Total Writes / Concurrency / Tamper %** (defaults)
- **🗑 Reset DB** — clear PG + Mongo เกลี้ยง (chain ลบไม่ได้)
- **▶ Run N Selected** — รันเฉพาะที่ติ๊ก
- Progress bar real-time + Status

### Results
- Tabular: 10 metric columns
- Click row → ขยายดู tampered samples (before/after diff)
- **📊 Download CSV** + **📄 Download JSON** report

---

## Other Web UI Pages

- `/send` — manual single send + verify (PG/Mongo toggle)
- `/verify` — verify by log id
- `/logs` — offchain logs
- `/anchored?chain=private|public` — single-anchor logs
- `/batched?chain=private|public` — Merkle batch leaves
- `/batches?chain=private|public` — batch records (Merkle root + counts)
- `/experiments` — 24-cell suite + reports

3rd-party explorer:
- Exonum Explorer (port 8080) — block / tx / hash anchor / batch anchor proof
- Sepolia Explorer (port 5500) — Etherscan-like view ของ tx ที่เรา anchor

---

## Reset DB Feature

### Why
Storage overhead, tamper, exposure window metrics จะแม่นยำเฉพาะถ้า DB เริ่มจาก state ว่าง

### How
- กดปุ่ม `🗑 Reset DB` ใน Experiments page
- POST `/experiment/reset-db`:
  - `pgAdapter.dropAll()` → DROP ทั้ง 7 ตาราง + recreate
  - `mongoAdapter.dropAll()` → drop collections + recreate
- **Chain data ไม่ถูกแตะ** — chain immutable ลบไม่ได้
- ใช้ก่อน run experiment เพื่อให้ผลสะอาด

---

## Code Structure

```
src/
├── core/                   # LogEntry, LogStorage interface, HashService
├── adapters/
│   ├── storage/            # Postgres/Mongo/Exonum/Ethereum anchors
│   └── composite/          # HybridStorage
├── modes/                  # Sync/BatchWriter
├── queue/                  # RabbitMQClient + publisher + subscriber
├── infrastructure/
│   ├── config/             # env.ts (typed config)
│   └── database/           # Postgres/Mongo adapters + migrate.ts
├── api/server.ts           # Express HTTP API
└── bench/                  # engine + runner + report

hybrid-logging-frontend/
├── src/views/              # SendLog / Verify / Logs / Anchored / Batched / Batches / ExperimentSuite
└── src/components/         # LogDetailModal

contracts/                  # LogStore.sol / HashStore.sol / BatchStore.sol
exonum-logstore/            # Rust services + Vue explorer (Aleksey's exonum-cryptocurrency-advanced fork)
```

---

# 2️⃣ ส่วนที่ยังไม่เสร็จ

---

## ที่เหลือ

### 🔄 รันทดสอบจริง
- รัน 24 cells × 3 รอบ (statistical reliability)
- Variations: scale tests (เช่น 100 / 500 / 1000 writes/cell)
- Capture: throughput, latency, BC confirm time, exposure window
- เก็บ raw data → CSV + JSON

### 📊 เก็บผล + วิเคราะห์
- Aggregate by strategy / mode
- เปรียบเทียบ DB vs hybrid vs pure chain
- เปรียบเทียบ Hash anchor vs Merkle batch (ลด tx ลงกี่ %)
- Tamper detection table
- Storage overhead curve

### 📖 ทำเล่ม (Thesis)
- บทที่ 4: ผลการทดลอง + กราฟ
- บทที่ 5: สรุป + ข้อเสนอแนะ
- เรียบเรียงตามกรอบที่อาจารย์กำหนด

---

## Timeline (proposed)

| Phase | Task | สัปดาห์ |
|---|---|---|
| 1 | Setup infra (PG, Mongo, Exonum, Sepolia, RabbitMQ) | ✅ เสร็จ |
| 2 | Implement 7 strategies + 3 modes | ✅ เสร็จ |
| 3 | Async queue + tamper test + metrics | ✅ เสร็จ |
| 4 | Web UI สำหรับ run experiment | ✅ เสร็จ |
| 5 | **รันทดสอบจริง + เก็บผล** | 🔄 กำลังเริ่ม |
| 6 | **วิเคราะห์ + กราฟ** | ⏳ ถัดไป |
| 7 | **เขียนเล่ม** | ⏳ ถัดไป |

---

## Demo

🎯 เปิด `localhost:5173/#/experiments`
1. กด **🗑 Reset DB**
2. ติ๊ก cells ที่อยากทดสอบ (เช่น batch mode 8 cells)
3. ตั้ง batchSize ของแต่ละ batch row
4. กด **▶ Run N Selected**
5. รอ progress bar เต็ม → กด Download CSV/JSON
6. กด row ใน Results → ดู tampered before/after

---

## Q&A

🙋 ขอบคุณครับ

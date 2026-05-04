/**
 * test-chain.ts
 * End-to-end integration test for all 3 Ethereum smart contracts on Sepolia.
 *
 * Run:  npx ts-node scripts/test-chain.ts
 *
 * Requires in .env:
 *   ETH_RPC_URL, ETH_PRIVATE_KEY,
 *   ETH_LOG_CONTRACT, ETH_HASH_CONTRACT, ETH_BATCH_CONTRACT
 */

import { ethers } from 'ethers';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';

// ── colour helpers ────────────────────────────────────────────────────────────
const green  = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red    = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const bold   = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim    = (s: string) => `\x1b[2m${s}\x1b[0m`;

// ── test runner ───────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function ok(label: string, detail = '') {
  passed++;
  console.log(`  ${green('✓')} ${label}${detail ? dim('  ' + detail) : ''}`);
}

function fail(label: string, detail = '') {
  failed++;
  console.log(`  ${red('✗')} ${label}${detail ? red('  ' + detail) : ''}`);
}

function assert(condition: boolean, label: string, detail = '') {
  condition ? ok(label, detail) : fail(label, detail);
}

function section(title: string) {
  console.log(`\n${bold(title)}`);
  console.log('─'.repeat(60));
}

// ── helpers ───────────────────────────────────────────────────────────────────
function loadAbi(contractName: string): ethers.InterfaceAbi {
  const p = path.join(__dirname, `../artifacts/contracts/${contractName}.sol/${contractName}.json`);
  return JSON.parse(fs.readFileSync(p, 'utf8')).abi;
}

function sha256Hex(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

/** Encode source string as bytes32 (right-padded with 0x00, max 31 bytes). */
function sourceToBytes32(source: string): string {
  const buf = Buffer.alloc(32);
  Buffer.from(source, 'utf8').copy(buf, 0, 0, 31);
  return '0x' + buf.toString('hex');
}

/** Compute SHA256 Merkle root matching BatchStore algorithm. */
function computeMerkleRoot(hexHashes: string[]): string {
  let leaves: Buffer[] = hexHashes.map(h => Buffer.from(h, 'hex') as Buffer);
  if (leaves.length === 0) return crypto.createHash('sha256').update('').digest('hex');
  while (leaves.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < leaves.length; i += 2) {
      const left  = leaves[i];
      const right = leaves[i + 1] ?? left;
      next.push(crypto.createHash('sha256').update(Buffer.concat([left, right])).digest());
    }
    leaves = next;
  }
  return leaves[0].toString('hex');
}

const LEVEL: Record<string, number> = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, CRITICAL: 4 };

// ── 1. LogStore (blockchain-only) ─────────────────────────────────────────────
async function testLogStore(wallet: ethers.Wallet) {
  section('1. LogStore — blockchain-only (full log on-chain)');

  const addr = process.env.ETH_LOG_CONTRACT!;
  const contract = new ethers.Contract(addr, loadAbi('LogStore'), wallet);

  const message  = 'Integration test — full log on Ethereum';
  const metadata = JSON.stringify({ test: true, suite: 'test-chain' });
  const canonical = JSON.stringify({ level: 'INFO', source: 'test-chain', message, metadata });
  const contentHash = '0x' + sha256Hex(canonical);

  // Check pre-condition
  const alreadyExists: boolean = await contract.exists(contentHash);
  if (alreadyExists) {
    ok('Record already on-chain (rerun detected)', contentHash.slice(0, 18) + '…');
  } else {
    console.log(dim(`  sending tx to LogStore ${addr.slice(0, 10)}…`));
    const tx = await contract.write(
      contentHash,
      LEVEL.INFO,
      sourceToBytes32('test-chain'),
      message.slice(0, 256),
      message,
      metadata,
    );
    console.log(dim(`  tx hash: ${tx.hash}`));
    const receipt = await tx.wait();
    assert(receipt.status === 1, 'Tx confirmed on-chain', `block #${receipt.blockNumber}`);
  }

  // Verify existence
  const exists: boolean = await contract.exists(contentHash);
  assert(exists, 'exists() returns true');

  // Read back record
  const rec = await contract.getRecord(contentHash);
  assert(Number(rec.level) === LEVEL.INFO,       'level = INFO (1)');
  assert(rec.message === message,                'full message stored on-chain');
  assert(rec.metadataJson === metadata,          'metadataJson stored on-chain');
  assert(rec.messagePreview === message.slice(0, 256), 'messagePreview correct');
  assert(Number(rec.historyLen) >= 1,            'historyLen ≥ 1');
  assert(rec.submitter.toLowerCase() === wallet.address.toLowerCase(), 'submitter = wallet');

  // logCount
  const count = await contract.logCount();
  assert(Number(count) >= 1, 'logCount ≥ 1', `count = ${count}`);

  // getPage
  const page: string[] = await contract.getPage(0, 5);
  assert(page.length >= 1,                  'getPage returns ≥ 1 item');
  assert(page.includes(contentHash),        'contentHash appears in page');

  return contentHash;
}

// ── 2. HashStore (hybrid single) ──────────────────────────────────────────────
async function testHashStore(wallet: ethers.Wallet) {
  section('2. HashStore — hybrid (hash only on-chain, full log off-chain)');

  const addr = process.env.ETH_HASH_CONTRACT!;
  const contract = new ethers.Contract(addr, loadAbi('HashStore'), wallet);

  const message  = 'Integration test — hybrid single hash anchor';
  const canonical = JSON.stringify({ level: 'WARN', source: 'test-chain', message });
  const contentHash = '0x' + sha256Hex(canonical);

  const alreadyExists: boolean = await contract.exists(contentHash);
  if (alreadyExists) {
    ok('Record already on-chain (rerun detected)', contentHash.slice(0, 18) + '…');
  } else {
    console.log(dim(`  sending tx to HashStore ${addr.slice(0, 10)}…`));
    const tx = await contract.write(
      contentHash,
      LEVEL.WARN,
      message.slice(0, 256),
    );
    console.log(dim(`  tx hash: ${tx.hash}`));
    const receipt = await tx.wait();
    assert(receipt.status === 1, 'Tx confirmed on-chain', `block #${receipt.blockNumber}`);
  }

  const exists: boolean = await contract.exists(contentHash);
  assert(exists, 'exists() returns true');

  const rec = await contract.getRecord(contentHash);
  assert(Number(rec.level) === LEVEL.WARN,       'level = WARN (2)');
  assert(rec.messagePreview === message.slice(0, 256), 'messagePreview stored');
  assert(Number(rec.historyLen) >= 1,            'historyLen ≥ 1');
  assert(rec.submitter.toLowerCase() === wallet.address.toLowerCase(), 'submitter = wallet');

  // No message/metadataJson fields (hybrid — data lives off-chain)
  assert(!('message' in rec),     'message field absent (off-chain only)');
  assert(!('metadataJson' in rec),'metadataJson field absent (off-chain only)');

  const count = await contract.recordCount();
  assert(Number(count) >= 1, 'recordCount ≥ 1', `count = ${count}`);

  const page: string[] = await contract.getPage(0, 5);
  assert(page.includes(contentHash), 'contentHash appears in page');

  return contentHash;
}

// ── 3. BatchStore (hybrid batch — Merkle root on-chain) ───────────────────────
async function testBatchStore(wallet: ethers.Wallet) {
  section('3. BatchStore — hybrid batch (Merkle root on-chain)');

  const addr = process.env.ETH_BATCH_CONTRACT!;
  const contract = new ethers.Contract(addr, loadAbi('BatchStore'), wallet);

  // Build 10 fake log hashes with a known level distribution
  const levels = ['DEBUG', 'INFO', 'INFO', 'INFO', 'WARN', 'ERROR', 'ERROR', 'CRITICAL', 'INFO', 'WARN'];
  const expectedCounts = { debug: 1, info: 4, warn: 2, error: 2, critical: 1 };

  const logHashes = levels.map((lvl, i) =>
    sha256Hex(JSON.stringify({ level: lvl, source: 'test-chain-batch', i }))
  );
  const merkleRootHex = computeMerkleRoot(logHashes);
  const merkleRoot = '0x' + merkleRootHex;

  const alreadyExists: boolean = await contract.exists(merkleRoot);
  if (alreadyExists) {
    ok('Batch already on-chain (rerun detected)', merkleRoot.slice(0, 18) + '…');
  } else {
    console.log(dim(`  sending tx to BatchStore ${addr.slice(0, 10)}…`));
    const tx = await contract.write(
      merkleRoot,
      'batch-2024-001',   // startId
      'batch-2024-010',   // endId
      10,                 // count
      expectedCounts.debug,
      expectedCounts.info,
      expectedCounts.warn,
      expectedCounts.error,
      expectedCounts.critical,
      LEVEL.CRITICAL,     // maxSeverity
    );
    console.log(dim(`  tx hash: ${tx.hash}`));
    const receipt = await tx.wait();
    assert(receipt.status === 1, 'Tx confirmed on-chain', `block #${receipt.blockNumber}`);
  }

  const exists: boolean = await contract.exists(merkleRoot);
  assert(exists, 'exists() returns true');

  const rec = await contract.getRecord(merkleRoot);
  assert(Number(rec.count)         === 10,                   'count = 10');
  assert(Number(rec.debugCount)    === expectedCounts.debug,    `debugCount = ${expectedCounts.debug}`);
  assert(Number(rec.infoCount)     === expectedCounts.info,     `infoCount = ${expectedCounts.info}`);
  assert(Number(rec.warnCount)     === expectedCounts.warn,     `warnCount = ${expectedCounts.warn}`);
  assert(Number(rec.errorCount)    === expectedCounts.error,    `errorCount = ${expectedCounts.error}`);
  assert(Number(rec.criticalCount) === expectedCounts.critical, `criticalCount = ${expectedCounts.critical}`);
  assert(Number(rec.maxSeverity)   === LEVEL.CRITICAL,          'maxSeverity = CRITICAL (4)');
  assert(rec.startId === 'batch-2024-001', 'startId stored');
  assert(rec.endId   === 'batch-2024-010', 'endId stored');
  assert(Number(rec.historyLen) >= 1,      'historyLen ≥ 1');

  // Merkle root integrity
  const recomputed = computeMerkleRoot(logHashes);
  assert(recomputed === merkleRootHex,
    'Recomputed Merkle root (SHA256, left-right, duplicate-last-if-odd) matches on-chain',
    recomputed === merkleRootHex ? '' : `expected ${merkleRootHex.slice(0, 16)}… got ${recomputed.slice(0, 16)}…`
  );

  const count = await contract.batchCount();
  assert(Number(count) >= 1, 'batchCount ≥ 1', `count = ${count}`);

  const page: string[] = await contract.getPage(0, 5);
  assert(page.includes(merkleRoot), 'merkleRoot appears in page');
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  const rpc        = process.env.ETH_RPC_URL!;
  const privateKey = process.env.ETH_PRIVATE_KEY!;

  if (!rpc || !privateKey || !process.env.ETH_LOG_CONTRACT) {
    console.error(red('Missing .env vars: ETH_RPC_URL, ETH_PRIVATE_KEY, ETH_LOG_CONTRACT, ETH_HASH_CONTRACT, ETH_BATCH_CONTRACT'));
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet   = new ethers.Wallet(privateKey, provider);
  const network  = await provider.getNetwork();
  const balance  = await provider.getBalance(wallet.address);

  console.log(bold('\n═══ Ethereum Smart Contract Integration Tests ═══'));
  console.log(dim(`  network  : ${network.name} (chainId ${network.chainId})`));
  console.log(dim(`  wallet   : ${wallet.address}`));
  console.log(dim(`  balance  : ${ethers.formatEther(balance)} ETH`));
  console.log(dim(`  LogStore : ${process.env.ETH_LOG_CONTRACT}`));
  console.log(dim(`  HashStore: ${process.env.ETH_HASH_CONTRACT}`));
  console.log(dim(`  Batch    : ${process.env.ETH_BATCH_CONTRACT}`));

  try {
    await testLogStore(wallet);
    await testHashStore(wallet);
    await testBatchStore(wallet);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`\n${red('Fatal error:')} ${msg}`);
    failed++;
  }

  const total = passed + failed;
  console.log(`\n${'─'.repeat(60)}`);
  console.log(bold('Results:') + `  ${green(String(passed))} passed  ${failed > 0 ? red(String(failed)) : dim('0')} failed  ${dim(String(total) + ' total')}`);
  if (failed === 0) {
    console.log(green(bold('All tests passed ✓')));
  } else {
    console.log(yellow(`${failed} test(s) failed`));
  }
  console.log();
  process.exit(failed > 0 ? 1 : 0);
}

main();

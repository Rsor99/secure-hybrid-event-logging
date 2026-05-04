/**
 * test-chain.ts
 * End-to-end integration test for all 3 Exonum services.
 *
 * Run:  npx ts-node scripts/test-chain.ts
 *
 * Requires:
 *   - Exonum node on localhost:8200  (docker compose up -d)
 *   - Node.js backend on localhost:3000  (npm run dev)
 */

import axios from 'axios';
import crypto from 'crypto';

const NODE_API  = 'http://localhost:3000';
const EXONUM    = 'http://localhost:8200/api/services';
const EXPLORER  = 'http://localhost:8200/api/explorer/v1';

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

// ── Merkle tree (must match HashService.computeBatchHash) ─────────────────────
function computeMerkleRoot(hashes: string[]): string {
  let leaves: Buffer[] = hashes.map(h => Buffer.from(h, 'hex'));
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

// ── helpers ───────────────────────────────────────────────────────────────────
async function writeLog(payload: object) {
  const res = await axios.post(`${NODE_API}/log`, payload);
  return res.data as { log: Record<string, string>; result: Record<string, unknown> };
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── 1. Log-Service (blockchain-only / full log) ───────────────────────────────
async function testLogService() {
  section('1. LogService — private_chain (full log on-chain)');

  const { log, result } = await writeLog({
    level: 'INFO',
    source: 'test-chain',
    message: 'Integration test — full log on blockchain',
    metadata: { test: true, suite: 'test-chain' },
    storageMode: 'private_chain',
    writeMode: 'sync',
  });

  assert(result.success === true,         'Write succeeded');
  assert(result.confirmed === true,       'Tx confirmed on-chain');
  assert(typeof log.dataHash === 'string' && log.dataHash.length === 64,
                                          'dataHash is 64-char hex');
  assert(typeof log.blockchainTxId === 'string' && log.blockchainTxId.length === 64,
                                          'blockchainTxId present');

  const hash = log.dataHash;

  // Query log-service using uniform ?hash= param
  const infoRes = await axios.get(`${EXONUM}/log-service/v1/logs/info?hash=${hash}`);
  const { block_proof, proof, record } = infoRes.data;

  assert(!!record,                        'record returned from chain');
  assert(record.content_hash === hash,    'content_hash matches');
  assert(record.level === 'INFO',         'level stored correctly');
  assert(record.source === 'test-chain',  'source stored correctly');
  assert(record.message === 'Integration test — full log on blockchain',
                                          'full message stored on-chain');
  assert(typeof record.metadata_json === 'string' && record.metadata_json.includes('"test":true'),
                                          'metadata_json stored on-chain');
  assert(typeof record.tx_hash === 'string' && record.tx_hash.length === 64,
                                          'tx_hash stored in record');
  assert(!!block_proof,                   'block_proof present');
  assert(!!proof,                         'proof present');
  assert(!!proof.to_table,                'proof.to_table present (table inclusion)');
  assert(!!proof.to_record,               'proof.to_record present (record inclusion)');

  // Explorer: confirm tx committed
  const txRes = await axios.get(`${EXPLORER}/transactions?hash=${record.tx_hash}`);
  assert(txRes.data.type === 'committed',   'Explorer confirms tx committed');
  const commitBlock: number = txRes.data.location?.block_height;
  assert(typeof commitBlock === 'number',   'Commit block height available',
    `block #${commitBlock}`);

  // list endpoint
  const listRes = await axios.get(`${EXONUM}/log-service/v1/logs/list?limit=5`);
  assert(listRes.data.total >= 1,           'logs/list returns ≥1 item');
  assert(Array.isArray(listRes.data.items), 'items is array');

  return hash;
}

// ── 2. HashService (hybrid single — hash only) ────────────────────────────────
async function testHashService() {
  section('2. HashService — hybrid_private (hash on-chain, full log off-chain)');

  const { log, result } = await writeLog({
    level: 'WARN',
    source: 'test-chain',
    message: 'Integration test — hybrid single hash anchor',
    metadata: { test: true, mode: 'hybrid' },
    storageMode: 'hybrid_private',
    writeMode: 'sync',
  });

  assert(result.success === true,   'Write succeeded');
  assert(result.confirmed === true, 'Tx confirmed on-chain');

  const hash = log.dataHash;

  // Query hash-service using uniform ?hash= param
  const infoRes = await axios.get(`${EXONUM}/hash-service/v1/hashes/info?hash=${hash}`);
  const { block_proof, proof, record } = infoRes.data;

  assert(!!record,                          'record returned from chain');
  assert(record.content_hash === hash,      'content_hash matches');
  assert(record.level === 'WARN',           'level stored correctly');
  assert(!('source' in record),             'source field absent (removed from schema)');
  assert(typeof record.tx_hash === 'string' && record.tx_hash.length === 64,
                                            'tx_hash stored in record');
  assert(!!block_proof,                     'block_proof present');
  assert(!!proof,                           'proof present');
  assert(!!proof.to_table,                  'proof.to_table present');
  assert(!!proof.to_record,                 'proof.to_record present');

  // Off-chain hash match via Node.js backend
  const verifyRes = await axios.get(`${NODE_API}/verify-offchain/${hash}`);
  assert(verifyRes.data.found_in_db === true, 'Log found in PostgreSQL');
  assert(verifyRes.data.match === true,       'Recomputed SHA256 matches on-chain hash');
  assert(verifyRes.data.recomputed_hash === hash,
                                              'recomputed_hash equals content_hash');

  // list endpoint
  const listRes = await axios.get(`${EXONUM}/hash-service/v1/hashes/list?limit=5`);
  assert(listRes.data.total >= 1,   'hashes/list returns ≥1 item');

  return hash;
}

// ── 3. BatchService (hybrid batch — Merkle root on-chain) ─────────────────────
async function testBatchService() {
  section('3. BatchService — hybrid_private_batch (batch Merkle root on-chain)');

  // Write exactly 10 logs with a known level mix to test distribution
  const levels = ['DEBUG', 'INFO', 'INFO', 'INFO', 'WARN', 'ERROR', 'ERROR', 'CRITICAL', 'INFO', 'WARN'];
  const expectedCounts = { debug: 1, info: 4, warn: 2, error: 2, critical: 1 };
  const logIds: string[] = [];  // capture IDs in insertion order

  console.log(dim(`  writing ${levels.length} batch logs (${levels.join(', ')})…`));
  for (const level of levels) {
    const { log } = await writeLog({
      level,
      source: 'test-chain-batch',
      message: `Batch integration test — level ${level}`,
      metadata: { test: true, level },
      storageMode: 'hybrid_private_batch',
      writeMode: 'batch',
    });
    logIds.push(log.id as string);
  }

  console.log(dim('  waiting for batch flush (BatchWriter size=10)…'));
  await sleep(8000);

  // Get most recent batch from chain
  const listRes = await axios.get(`${EXONUM}/batch-service/v1/batches/list?limit=1`);
  assert(listRes.data.total >= 1, 'batches/list returns ≥1 item');

  const batchItem = listRes.data.items?.[0];
  assert(!!batchItem, 'At least one batch on chain');
  if (!batchItem) return;

  const batchHash = batchItem.content_hash;  // uniform field name

  // Query batch-service info using uniform ?hash= param
  const infoRes = await axios.get(`${EXONUM}/batch-service/v1/batches/info?hash=${batchHash}`);
  const { block_proof, proof, record } = infoRes.data;

  assert(!!record,                 'record returned from chain');
  assert(record.count === 10,      'count = 10');
  assert(!('level' in record),     'level field absent (removed from schema)');
  assert(!('source' in record),    'source field absent (removed from schema)');
  assert(typeof record.start_id === 'string', 'start_id present');
  assert(typeof record.end_id === 'string',   'end_id present');
  assert(typeof record.tx_hash === 'string' && record.tx_hash.length === 64,
                                   'tx_hash stored in record');
  assert(!!block_proof,            'block_proof present');
  assert(!!proof,                  'proof present');
  assert(!!proof.to_table,         'proof.to_table present');
  assert(!!proof.to_record,        'proof.to_record present');

  // Level distribution
  assert(record.debug_count    === expectedCounts.debug,    `debug_count = ${expectedCounts.debug}`,    `got ${record.debug_count}`);
  assert(record.info_count     === expectedCounts.info,     `info_count = ${expectedCounts.info}`,      `got ${record.info_count}`);
  assert(record.warn_count     === expectedCounts.warn,     `warn_count = ${expectedCounts.warn}`,      `got ${record.warn_count}`);
  assert(record.error_count    === expectedCounts.error,    `error_count = ${expectedCounts.error}`,    `got ${record.error_count}`);
  assert(record.critical_count === expectedCounts.critical, `critical_count = ${expectedCounts.critical}`, `got ${record.critical_count}`);
  assert(record.max_severity === 'CRITICAL', 'max_severity = CRITICAL', `got ${record.max_severity}`);

  // Merkle root integrity — fetch logs by their IDs in insertion order
  const logDetails = await Promise.all(
    logIds.map(id => axios.get(`${NODE_API}/log/${id}`).then(r => r.data as { id: string; dataHash: string }))
  );
  const allHashesPresent = logDetails.every(l => typeof l.dataHash === 'string' && l.dataHash.length === 64);
  assert(allHashesPresent, 'All 10 batch log hashes retrievable from PostgreSQL');

  if (allHashesPresent) {
    const hashes = logDetails.map(l => l.dataHash);
    const recomputed = computeMerkleRoot(hashes);
    assert(recomputed === batchHash,
      'Recomputed Merkle root (SHA256, left-right, duplicate-last-if-odd) matches on-chain content_hash',
      recomputed === batchHash ? '' : `expected ${batchHash.slice(0, 16)}… got ${recomputed.slice(0, 16)}…`
    );
  }

  return batchHash;
}

// ── 4. Chain health checks ────────────────────────────────────────────────────
async function testChainHealth() {
  section('4. Chain health');

  const blocksRes = await axios.get(`${EXPLORER}/blocks?count=1`);
  const height: number = blocksRes.data.blocks?.[0]?.height;
  assert(typeof height === 'number' && height > 0, 'Chain is producing blocks', `height #${height}`);

  const supervisorRes = await axios.get('http://localhost:8200/api/services/supervisor/consensus-config');
  const keys: unknown[] = supervisorRes.data.validator_keys;
  assert(Array.isArray(keys) && keys.length > 0, `Validator keys returned`, `${keys.length} validator(s)`);
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(bold('\n═══ Exonum Chain Integration Tests ═══'));
  console.log(dim(`  node api : ${NODE_API}`));
  console.log(dim(`  exonum   : http://localhost:8200`));

  try {
    await testChainHealth();
    await testLogService();
    await testHashService();
    await testBatchService();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`\n${red('Fatal error:')} ${msg}`);
    if (axios.isAxiosError(err) && err.response) {
      console.log(red('Response:'), JSON.stringify(err.response.data, null, 2));
    }
    failed++;
  }

  // ── summary ─────────────────────────────────────────────────────────────────
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

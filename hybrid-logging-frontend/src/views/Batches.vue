<template>
  <div>
    <div class="card" style="margin-bottom:20px">
      <p class="section-title">
        Batch Records
        <span class="table-badge">batches_{{ filter.chain }}</span>
      </p>
      <p style="font-size:12px; color:#8b949e; margin-bottom:16px">
        Each row is a batch of logs whose SHA-256 Merkle root was anchored to the blockchain.
        Leaf logs live in <code style="font-size:11px; color:#58a6ff">logs_batched_{{ filter.chain }}</code>.
      </p>
      <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end">
        <div>
          <label class="label">Chain</label>
          <select v-model="filter.chain" class="select" style="width:120px" @change="load(true)">
            <option value="private">Private (Exonum)</option>
            <option value="public">Public (Ethereum)</option>
          </select>
        </div>
        <div>
          <label class="label">Anchor Status</label>
          <select v-model="filter.anchorStatus" class="select" style="width:140px" @change="load(true)">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <button class="btn btn-primary" @click="load(true)">Filter</button>
        <button class="btn btn-ghost" @click="reset">Reset</button>
        <span style="margin-left:auto; font-size:12px; color:#8b949e; align-self:center">
          {{ total }} batches
        </span>
      </div>
    </div>

    <div v-if="rows.length" class="card">
      <div class="batch-table">
        <div class="batch-header">
          <span style="width:130px">Merkle Root</span>
          <span style="width:60px; text-align:center">Logs</span>
          <span style="width:90px; text-align:center">Max Severity</span>
          <span style="flex:1">Level Distribution</span>
          <span style="width:90px">Start ID</span>
          <span style="width:90px">End ID</span>
          <span style="width:100px; text-align:center">Anchor</span>
          <span style="width:80px">Tx Hash</span>
          <span style="width:140px">Created</span>
        </div>
        <div v-for="row in rows" :key="row.merkleRoot" class="batch-row">
          <span class="mono hash-chip" style="width:130px" :title="row.merkleRoot" @click="copy(row.merkleRoot)">
            {{ row.merkleRoot?.slice(0,10) }}…
          </span>
          <span style="width:60px; text-align:center; font-size:13px; font-weight:600">
            {{ row.logCount }}
          </span>
          <span style="width:90px; text-align:center">
            <span class="tag" :class="`tag-${levelName(row.maxSeverity).toLowerCase()}`">
              {{ levelName(row.maxSeverity) }}
            </span>
          </span>
          <span style="flex:1; font-size:11px; color:#8b949e; display:flex; gap:6px; flex-wrap:wrap">
            <span v-if="row.debugCount"    class="dist-chip tag-debug">D:{{ row.debugCount }}</span>
            <span v-if="row.infoCount"     class="dist-chip tag-info">I:{{ row.infoCount }}</span>
            <span v-if="row.warnCount"     class="dist-chip tag-warn">W:{{ row.warnCount }}</span>
            <span v-if="row.errorCount"    class="dist-chip tag-error">E:{{ row.errorCount }}</span>
            <span v-if="row.criticalCount" class="dist-chip tag-critical">C:{{ row.criticalCount }}</span>
          </span>
          <span class="mono" style="width:90px; font-size:11px; color:#8b949e; overflow:hidden; text-overflow:ellipsis; white-space:nowrap" :title="row.startId">
            {{ row.startId?.slice(0,8) }}…
          </span>
          <span class="mono" style="width:90px; font-size:11px; color:#8b949e; overflow:hidden; text-overflow:ellipsis; white-space:nowrap" :title="row.endId">
            {{ row.endId?.slice(0,8) }}…
          </span>
          <span style="width:100px; text-align:center">
            <span class="status-badge" :class="`status-${row.anchorStatus}`">{{ row.anchorStatus }}</span>
          </span>
          <span class="mono hash-chip" style="width:80px" :title="row.anchorTxHash" @click="copy(row.anchorTxHash)">
            {{ row.anchorTxHash ? row.anchorTxHash.slice(0,8) + '…' : '—' }}
          </span>
          <span class="mono" style="width:140px; font-size:11px; color:#8b949e">
            {{ fmtTime(row.createdAt) }}
          </span>
        </div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0 0">
        <button class="btn btn-ghost" style="padding:6px 14px" :disabled="offset === 0" @click="prevPage">← Newer</button>
        <span style="font-size:12px; color:#8b949e">{{ offset + 1 }}–{{ Math.min(offset + limit, total) }} of {{ total }}</span>
        <button class="btn btn-ghost" style="padding:6px 14px" :disabled="offset + limit >= total" @click="nextPage">Older →</button>
      </div>
    </div>

    <div v-else-if="!loading" class="card" style="color:#8b949e; font-size:14px; text-align:center">
      No batch records yet. Use <strong>Hybrid Private Batch</strong> or <strong>Hybrid Public Batch</strong> strategies.
    </div>
    <div v-if="loading" style="text-align:center; padding:32px; color:#8b949e">Loading…</div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, inject, watch } from 'vue'
import axios from 'axios'

const dbBackend = inject('dbBackend', ref('postgres'))

const LIMIT = 50
const LEVEL_NAMES = ['DEBUG','INFO','WARN','ERROR','CRITICAL']
const filter = reactive({ chain: 'private', anchorStatus: '' })
const rows    = ref([])
const total   = ref(0)
const offset  = ref(0)
const loading = ref(false)
const limit   = LIMIT

watch(dbBackend, () => load(true))

async function load(resetOffset = false) {
  if (resetOffset) offset.value = 0
  loading.value = true
  try {
    const params = { limit, offset: offset.value, db: dbBackend.value, chain: filter.chain }
    if (filter.anchorStatus) params.anchorStatus = filter.anchorStatus
    const res = await axios.get('/logs/batches', { params })
    rows.value  = res.data.rows || []
    total.value = res.data.total ?? rows.value.length
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

function reset() { filter.chain = 'private'; filter.anchorStatus = ''; load(true) }
function prevPage() { offset.value = Math.max(0, offset.value - limit); load() }
function nextPage() { offset.value += limit; load() }
function levelName(n) { return LEVEL_NAMES[n] ?? 'INFO' }
function fmtTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' })
}
function copy(v) { if (v) navigator.clipboard?.writeText(v) }
onMounted(() => load())
</script>

<style scoped>
.table-badge {
  font-size: 11px; background: #1a2d4a; color: #58a6ff;
  padding: 2px 8px; border-radius: 99px; font-family: monospace;
  font-weight: 400; margin-left: 8px; vertical-align: middle;
}
.batch-table { display: flex; flex-direction: column; overflow-x: auto; }
.batch-header {
  display: flex; align-items: center; gap: 10px; padding: 6px 0;
  border-bottom: 1px solid #30363d;
  font-size: 11px; color: #8b949e; text-transform: uppercase; letter-spacing: .05em;
  min-width: 900px;
}
.batch-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 0; border-bottom: 1px solid #21262d;
  font-size: 13px; color: #e2e8f0; min-width: 900px;
}
.batch-row:last-child { border-bottom: none; }
.hash-chip { color: #58a6ff; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hash-chip:hover { text-decoration: underline; }
.dist-chip { padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.status-pending   { background: #2d1e00; color: #e3b341; }
.status-confirmed { background: #0c2d1e; color: #3fb950; }
.status-failed    { background: #3d0c0c; color: #f85149; }
</style>

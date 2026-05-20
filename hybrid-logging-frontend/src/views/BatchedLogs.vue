<template>
  <div>
    <LogDetailModal :log="selected" :db="dbBackend" @close="selected = null" />
    <div class="card" style="margin-bottom:20px">
      <p class="section-title">
        Batched Logs
        <span class="table-badge">logs_batched_{{ filter.chain }}</span>
      </p>
      <p style="font-size:12px; color:#8b949e; margin-bottom:16px">
        Hybrid batch mode — full log in DB as Merkle leaf. Batch root anchored to blockchain per group.
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
          <label class="label">Level</label>
          <select v-model="filter.level" class="select" style="width:130px" @change="load(true)">
            <option value="">All</option>
            <option>DEBUG</option><option>INFO</option>
            <option>WARN</option><option>ERROR</option><option>CRITICAL</option>
          </select>
        </div>
        <div>
          <label class="label">Batch Status</label>
          <select v-model="filter.batched" class="select" style="width:140px" @change="load(true)">
            <option value="">All</option>
            <option value="pending">Pending (unassigned)</option>
            <option value="assigned">In a batch</option>
          </select>
        </div>
        <button class="btn btn-primary" @click="load(true)">Filter</button>
        <button class="btn btn-ghost" @click="reset">Reset</button>
        <span style="margin-left:auto; font-size:12px; color:#8b949e; align-self:center">
          {{ total }} entries
        </span>
      </div>
    </div>

    <div v-if="rows.length" class="card">
      <div class="log-table">
        <div class="log-header">
          <span style="width:140px">Time</span>
          <span style="width:72px">Level</span>
          <span style="width:110px">Source</span>
          <span style="flex:1">Message</span>
          <span style="width:120px">Content Hash</span>
          <span style="width:120px">Batch Root</span>
          <span style="width:50px; text-align:center">Leaf #</span>
        </div>
        <div v-for="row in rows" :key="row.id" class="log-row" style="cursor:pointer" @click="open(row)">
          <span class="mono" style="width:140px; font-size:11px; color:#8b949e">
            {{ fmtTime(row.timestamp) }}
          </span>
          <span style="width:72px">
            <span class="tag" :class="`tag-${row.level.toLowerCase()}`">{{ row.level }}</span>
          </span>
          <span style="width:110px; font-size:12px; color:#8b949e; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">
            {{ row.source }}
          </span>
          <span style="flex:1; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">
            {{ row.message }}
          </span>
          <span class="mono hash-chip" style="width:120px" :title="row.contentHash" @click="copy(row.contentHash)">
            {{ row.contentHash?.slice(0,10) }}…
          </span>
          <span class="mono" style="width:120px; font-size:11px">
            <span v-if="row.batchRoot" class="hash-chip" :title="row.batchRoot" @click="copy(row.batchRoot)">
              {{ row.batchRoot.slice(0,10) }}…
            </span>
            <span v-else style="color:#e3b341; font-size:11px">pending</span>
          </span>
          <span style="width:50px; text-align:center; font-size:12px; color:#8b949e">
            {{ row.leafIndex !== undefined && row.leafIndex !== null ? row.leafIndex : '—' }}
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
      No batched logs found. Use <strong>Hybrid Private Batch</strong> or <strong>Hybrid Public Batch</strong> strategies.
    </div>
    <div v-if="loading" style="text-align:center; padding:32px; color:#8b949e">Loading…</div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, inject, watch } from 'vue'
import axios from 'axios'
import LogDetailModal from '../components/LogDetailModal.vue'

const dbBackend = inject('dbBackend', ref('postgres'))
const selected  = ref(null)

function mapBatched(data) {
  // Batched rows expose contentHash/batchRoot — bridge them to LogDetailModal field names.
  return {
    ...data,
    dataHash:            data.dataHash       ?? data.contentHash,
    blockchainTxId:      data.blockchainTxId ?? null,
    blockchainConfirmed: data.blockchainConfirmed ?? !!data.batchRoot,
    storageMode:         `hybrid_${filter.chain}_batch`,
    chain:               filter.chain,
  }
}

async function open(row) {
  try {
    const res = await axios.get(`/log/${row.id}`, { params: { db: dbBackend.value } })
    selected.value = mapBatched({ ...row, ...res.data })
  } catch {
    selected.value = mapBatched(row)
  }
}

const LIMIT = 50
const filter = reactive({ chain: 'private', level: '', batched: '' })
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
    if (filter.level)   params.level   = filter.level
    if (filter.batched) params.batched = filter.batched
    const res = await axios.get('/logs/batched', { params })
    rows.value  = res.data.rows || []
    total.value = res.data.total ?? rows.value.length
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

function reset() { filter.chain = 'private'; filter.level = ''; filter.batched = ''; load(true) }
function prevPage() { offset.value = Math.max(0, offset.value - limit); load() }
function nextPage() { offset.value += limit; load() }
function fmtTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' })
}
function copy(v) { navigator.clipboard?.writeText(v) }
onMounted(() => load())
</script>

<style scoped>
.table-badge {
  font-size: 11px; background: #1a2d4a; color: #58a6ff;
  padding: 2px 8px; border-radius: 99px; font-family: monospace;
  font-weight: 400; margin-left: 8px; vertical-align: middle;
}
.log-table { display: flex; flex-direction: column; }
.log-header {
  display: flex; align-items: center; gap: 12px; padding: 6px 0;
  border-bottom: 1px solid #30363d;
  font-size: 11px; color: #8b949e; text-transform: uppercase; letter-spacing: .05em;
}
.log-row {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 0; border-bottom: 1px solid #21262d;
  font-size: 13px; color: #e2e8f0;
}
.log-row:last-child { border-bottom: none; }
.hash-chip { color: #58a6ff; cursor: pointer; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hash-chip:hover { text-decoration: underline; }
</style>

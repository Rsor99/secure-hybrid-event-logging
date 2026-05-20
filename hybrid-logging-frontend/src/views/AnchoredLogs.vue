<template>
  <div>
    <LogDetailModal :log="selected" :db="dbBackend" @close="selected = null" />
    <div class="card" style="margin-bottom:20px">
      <p class="section-title">
        Anchored Logs
        <span class="table-badge">logs_anchored_{{ filter.chain }}</span>
      </p>
      <p style="font-size:12px; color:#8b949e; margin-bottom:16px">
        Hybrid single-anchor mode — full log in DB, SHA-256 hash anchored to blockchain per log.
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
          <label class="label">Anchor Status</label>
          <select v-model="filter.anchorStatus" class="select" style="width:140px" @change="load(true)">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div style="flex:1; min-width:180px">
          <label class="label">Source</label>
          <input v-model="filter.source" class="input" placeholder="e.g. auth-service" @keydown.enter="load(true)" />
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
          <span style="width:120px">Source</span>
          <span style="flex:1">Message</span>
          <span style="width:130px">Content Hash</span>
          <span style="width:100px; text-align:center">Anchor</span>
        </div>
        <div v-for="row in rows" :key="row.id" class="log-row" style="cursor:pointer" @click="open(row)">
          <span class="mono" style="width:140px; font-size:11px; color:#8b949e">
            {{ fmtTime(row.timestamp) }}
          </span>
          <span style="width:72px">
            <span class="tag" :class="`tag-${row.level.toLowerCase()}`">{{ row.level }}</span>
          </span>
          <span style="width:120px; font-size:12px; color:#8b949e; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">
            {{ row.source }}
          </span>
          <span style="flex:1; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">
            {{ row.message }}
          </span>
          <span
            class="mono hash-chip" style="width:130px"
            :title="row.contentHash"
            @click="copy(row.contentHash)"
          >
            {{ row.contentHash?.slice(0,12) }}…
          </span>
          <span style="width:100px; text-align:center">
            <span class="status-badge" :class="`status-${row.anchorStatus}`">
              {{ row.anchorStatus }}
            </span>
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
      No anchored logs found. Use <strong>Hybrid Private</strong> or <strong>Hybrid Public</strong> strategies when sending.
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

function mapAnchored(data) {
  // Anchored rows expose contentHash/anchorTxHash/anchorStatus — bridge them
  // to the field names the LogDetailModal reads (dataHash/blockchainTxId/blockchainConfirmed).
  return {
    ...data,
    dataHash:            data.dataHash            ?? data.contentHash,
    blockchainTxId:      data.blockchainTxId      ?? data.anchorTxHash,
    blockchainConfirmed: data.blockchainConfirmed ?? (data.anchorStatus === 'confirmed'),
    storageMode:         `hybrid_${filter.chain}`,
    chain:               filter.chain,
  }
}

async function open(row) {
  // /log/:id only finds offchain entries; anchored rows live in logs_anchored_*
  // so the lookup will 404 and we fall back to the row data we already have.
  try {
    const res = await axios.get(`/log/${row.id}`, { params: { db: dbBackend.value } })
    selected.value = mapAnchored({ ...row, ...res.data })
  } catch {
    selected.value = mapAnchored(row)
  }
}

const LIMIT = 50
const filter = reactive({ chain: 'private', level: '', source: '', anchorStatus: '' })
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
    if (filter.level)        params.level        = filter.level
    if (filter.source)       params.source       = filter.source
    if (filter.anchorStatus) params.anchorStatus = filter.anchorStatus
    const res = await axios.get('/logs/anchored', { params })
    rows.value  = res.data.rows || []
    total.value = res.data.total ?? rows.value.length
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

function reset() { filter.chain = 'private'; filter.level = ''; filter.source = ''; filter.anchorStatus = ''; load(true) }
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
.status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.status-pending   { background: #2d1e00; color: #e3b341; }
.status-confirmed { background: #0c2d1e; color: #3fb950; }
.status-failed    { background: #3d0c0c; color: #f85149; }
</style>

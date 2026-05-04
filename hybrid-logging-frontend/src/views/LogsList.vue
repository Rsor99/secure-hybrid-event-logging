<template>
  <div>
    <!-- Filters -->
    <div class="card" style="margin-bottom:20px">
      <p class="section-title">Logs</p>
      <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end">
        <div>
          <label class="label">Level</label>
          <select v-model="filter.level" class="select" style="width:130px" @change="load(true)">
            <option value="">All</option>
            <option>DEBUG</option><option>INFO</option>
            <option>WARN</option><option>ERROR</option><option>CRITICAL</option>
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

    <!-- Table -->
    <div v-if="logs.length" class="card">
      <div class="log-table">
        <div class="log-header">
          <span style="width:140px">Time</span>
          <span style="width:80px">Level</span>
          <span style="width:130px">Source</span>
          <span style="flex:1">Message</span>
          <span style="width:90px">ID</span>
          <span style="width:60px; text-align:center">Chain</span>
        </div>
        <div v-for="log in logs" :key="log.id" class="log-row">
          <span class="mono" style="width:140px; font-size:11px; color:#8b949e">
            {{ formatTime(log.timestamp) }}
          </span>
          <span style="width:80px">
            <span class="tag" :class="`tag-${log.level.toLowerCase()}`">{{ log.level }}</span>
          </span>
          <span style="width:130px; font-size:12px; color:#8b949e; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">
            {{ log.source }}
          </span>
          <span style="flex:1; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">
            {{ log.message }}
          </span>
          <span
            class="mono log-id-chip"
            style="width:90px"
            :title="log.id"
            @click="copyId(log.id)"
          >
            {{ log.id.slice(0, 8) }}…
          </span>
          <span style="width:60px; text-align:center">
            <span v-if="log.blockchainConfirmed" title="Anchored on chain" style="color:#3fb950">⛓</span>
            <span v-else-if="log.blockchainTxId"  title="Tx submitted, pending" style="color:#e3b341">⏳</span>
            <span v-else                           title="DB only"              style="color:#30363d">—</span>
          </span>
        </div>
      </div>

      <!-- Pagination -->
      <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0 0">
        <button class="btn btn-ghost" style="padding:6px 14px" :disabled="offset === 0" @click="prevPage">← Newer</button>
        <span style="font-size:12px; color:#8b949e">{{ offset + 1 }}–{{ Math.min(offset + limit, total) }} of {{ total }}</span>
        <button class="btn btn-ghost" style="padding:6px 14px" :disabled="offset + limit >= total" @click="nextPage">Older →</button>
      </div>
    </div>

    <div v-else-if="!loading" class="card" style="color:#8b949e; font-size:14px; text-align:center">
      No logs found{{ filter.level || filter.source ? ' for current filters' : '' }}.
    </div>

    <div v-if="loading" style="text-align:center; padding:32px; color:#8b949e">Loading…</div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'

const LIMIT = 50

const filter = reactive({ level: '', source: '' })
const logs    = ref([])
const total   = ref(0)
const offset  = ref(0)
const loading = ref(false)
const limit   = LIMIT

async function load(resetOffset = false) {
  if (resetOffset) offset.value = 0
  loading.value = true
  try {
    const params = { limit, offset: offset.value }
    if (filter.level)  params.level  = filter.level
    if (filter.source) params.source = filter.source
    const res = await axios.get('/logs', { params })
    logs.value  = res.data.logs || []
    total.value = res.data.total ?? logs.value.length
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function reset() {
  filter.level  = ''
  filter.source = ''
  load(true)
}

function prevPage() { offset.value = Math.max(0, offset.value - limit); load() }
function nextPage() { offset.value += limit; load() }

function formatTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' })
}

function copyId(id) {
  navigator.clipboard?.writeText(id)
}

onMounted(() => load())
</script>

<style scoped>
.log-table { display: flex; flex-direction: column; gap: 0; }
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
.log-id-chip {
  color: #58a6ff; cursor: pointer; font-size: 11px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.log-id-chip:hover { text-decoration: underline; }
</style>

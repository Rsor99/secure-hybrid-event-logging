<template>
  <div>
    <!-- Config panel -->
    <div class="card" style="margin-bottom:20px">
      <p class="section-title">Storage Strategy</p>
      <div class="strategy-grid">
        <button
          v-for="s in strategies" :key="s.id"
          class="strategy-btn"
          :class="{ active: form.storageMode === s.id }"
          @click="form.storageMode = s.id"
        >
          <span class="strategy-icon">{{ s.icon }}</span>
          <span class="strategy-label">{{ s.label }}</span>
          <span class="strategy-sub">{{ s.sub }}</span>
        </button>
      </div>

      <div class="row-3" style="margin-top:20px">
        <div>
          <label class="label">Write Mode</label>
          <select v-model="form.writeMode" class="select">
            <option value="sync">Sync</option>
            <option value="async">Async</option>
            <option value="batch">Batch</option>
          </select>
        </div>
        <div>
          <label class="label">Level</label>
          <select v-model="form.level" class="select">
            <option>DEBUG</option><option>INFO</option>
            <option>WARN</option><option>ERROR</option><option>CRITICAL</option>
          </select>
        </div>
        <div>
          <label class="label">Source</label>
          <input v-model="form.source" class="input" placeholder="e.g. auth-service" />
        </div>
      </div>

      <div style="margin-top:14px">
        <label class="label">Message</label>
        <textarea v-model="form.message" class="textarea" placeholder="Log message..." />
      </div>

      <div style="margin-top:14px">
        <label class="label">Metadata (JSON, optional)</label>
        <input v-model="metaRaw" class="input mono" placeholder='{"userId":"123"}' />
        <p v-if="metaError" class="err-text">{{ metaError }}</p>
      </div>

      <div style="margin-top:18px; display:flex; gap:10px; align-items:center">
        <button class="btn btn-primary" :disabled="sending" @click="sendOne">
          {{ sending ? 'Sending…' : '▶ Send Log' }}
        </button>
        <button class="btn btn-ghost" @click="sendBurst" :disabled="sending">
          ⚡ Burst ×10
        </button>
        <button v-if="log.length" class="btn btn-danger" style="margin-left:auto" @click="log=[]">
          Clear
        </button>
      </div>
    </div>

    <!-- Live log -->
    <div v-if="log.length" class="card">
      <p class="section-title">Response Log <span style="color:#3fb950">({{ log.length }})</span></p>
      <div class="log-scroll">
        <div v-for="(entry, i) in [...log].reverse()" :key="i" class="log-row">
          <span class="log-time">{{ entry.time }}</span>
          <span class="tag" :class="entry.ok ? 'tag-info' : 'tag-error'">
            {{ entry.ok ? '✓ OK' : '✗ ERR' }}
          </span>
          <span class="mono" style="color:#e3b341">{{ entry.latency }}ms</span>
          <span class="strategy-pill">{{ entry.strategy }}</span>
          <span class="mono log-id" v-if="entry.id" @click="copyId(entry.id)" title="Click to copy ID">
            {{ entry.id.slice(0,8) }}…
          </span>
          <span v-if="entry.txId" class="mono" style="color:#3fb950; font-size:11px">
            tx: {{ entry.txId.slice(0,12) }}…
          </span>
          <span v-if="entry.error" class="err-text" style="flex:1">{{ entry.error }}</span>
        </div>
      </div>

      <!-- Summary bar -->
      <div class="summary-bar" v-if="log.length > 1">
        <div class="stat">
          <span class="stat-label">Total</span>
          <span class="stat-val">{{ log.length }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Success</span>
          <span class="stat-val ok">{{ log.filter(e=>e.ok).length }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Failed</span>
          <span class="stat-val err">{{ log.filter(e=>!e.ok).length }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Avg Latency</span>
          <span class="stat-val">{{ avgLatency }}ms</span>
        </div>
        <div class="stat">
          <span class="stat-label">Min / Max</span>
          <span class="stat-val">{{ minLatency }} / {{ maxLatency }}ms</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import axios from 'axios'

const strategies = [
  { id: '',               icon: '🗄️',  label: 'DB Only',       sub: 'PostgreSQL' },
  { id: 'private_chain',  icon: '⛓️',  label: 'Private Chain', sub: 'Exonum' },
  { id: 'public_chain',   icon: '🌐',  label: 'Public Chain',  sub: 'Ethereum' },
  { id: 'hybrid_private', icon: '🔀',  label: 'Hybrid Private', sub: 'DB + Exonum' },
  { id: 'hybrid_public',  icon: '🔀',  label: 'Hybrid Public',  sub: 'DB + Ethereum' },
]

const form = reactive({
  level: 'INFO',
  source: 'debug-ui',
  message: 'Test log from hybrid-logging-frontend',
  storageMode: '',
  writeMode: 'sync',
})

const metaRaw  = ref('')
const metaError = ref('')
const sending  = ref(false)
const log      = ref([])

const avgLatency = computed(() => {
  const ok = log.value.filter(e => e.ok)
  if (!ok.length) return 0
  return Math.round(ok.reduce((a, b) => a + b.latency, 0) / ok.length)
})
const minLatency = computed(() => Math.min(...log.value.filter(e=>e.ok).map(e=>e.latency)))
const maxLatency = computed(() => Math.max(...log.value.filter(e=>e.ok).map(e=>e.latency)))

function parseMetadata() {
  metaError.value = ''
  if (!metaRaw.value.trim()) return {}
  try { return JSON.parse(metaRaw.value) }
  catch { metaError.value = 'Invalid JSON'; return null }
}

async function fire() {
  const meta = parseMetadata()
  if (meta === null) return null

  const body = {
    level:    form.level,
    source:   form.source,
    message:  form.message,
    metadata: meta,
    writeMode: form.writeMode,
  }
  if (form.storageMode) body.storageMode = form.storageMode

  const t0 = performance.now()
  try {
    const res = await axios.post('/log', body)
    const latency = Math.round(performance.now() - t0)
    const r = res.data
    log.value.push({
      ok: true,
      time: new Date().toLocaleTimeString(),
      latency,
      strategy: form.storageMode || 'db_only',
      id: r.log?.id,
      txId: r.log?.blockchainTxId,
      error: null,
    })
    return r
  } catch (e) {
    const latency = Math.round(performance.now() - t0)
    log.value.push({
      ok: false,
      time: new Date().toLocaleTimeString(),
      latency,
      strategy: form.storageMode || 'db_only',
      id: null,
      txId: null,
      error: e.response?.data?.error ?? e.message,
    })
    return null
  }
}

async function sendOne() {
  sending.value = true
  await fire()
  sending.value = false
}

async function sendBurst() {
  sending.value = true
  await Promise.allSettled(Array.from({ length: 10 }, () => fire()))
  sending.value = false
}

function copyId(id) {
  navigator.clipboard?.writeText(id)
}
</script>

<style scoped>
.strategy-grid {
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;
}
.strategy-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 12px 8px; border-radius: 8px; border: 1px solid #30363d;
  background: #0d1117; cursor: pointer; transition: all .15s; color: #e2e8f0;
}
.strategy-btn:hover  { border-color: #58a6ff; background: #161b22; }
.strategy-btn.active { border-color: #58a6ff; background: #0c2a4a; }
.strategy-icon  { font-size: 22px; }
.strategy-label { font-size: 12px; font-weight: 600; text-align: center; }
.strategy-sub   { font-size: 11px; color: #8b949e; text-align: center; }

.row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }

.log-scroll { max-height: 360px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
.log-row {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 8px 10px; background: #0d1117; border-radius: 6px;
  border: 1px solid #21262d;
}
.log-time    { font-size: 11px; color: #8b949e; white-space: nowrap; }
.log-id      { color: #58a6ff; cursor: pointer; }
.log-id:hover { text-decoration: underline; }
.strategy-pill {
  font-size: 11px; padding: 2px 7px; background: #21262d;
  border-radius: 10px; color: #8b949e;
}
.err-text { font-size: 12px; color: #f85149; }

.summary-bar {
  display: flex; gap: 24px; flex-wrap: wrap;
  margin-top: 16px; padding-top: 16px; border-top: 1px solid #21262d;
}
.stat { display: flex; flex-direction: column; gap: 2px; }
.stat-label { font-size: 11px; color: #8b949e; }
.stat-val   { font-size: 18px; font-weight: 700; color: #e2e8f0; }
.stat-val.ok  { color: #3fb950; }
.stat-val.err { color: #f85149; }
</style>

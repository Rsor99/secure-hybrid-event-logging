<template>
  <div>
    <!-- Defaults -->
    <div class="card" style="margin-bottom:20px">
      <p class="section-title">Experiment Suite</p>
      <p style="font-size:13px; color:#8b949e; margin-bottom:16px">
        Pick the cells you want to run. Defaults below apply to every selected cell —
        per-cell <strong>Batch Size</strong> overrides the default for batch-mode cells.
      </p>

      <div class="row-3">
        <div>
          <label class="label">Total Writes / Cell</label>
          <input v-model.number="defaults.totalWrites" type="number" min="1" class="input" />
        </div>
        <div>
          <label class="label">Concurrency</label>
          <input v-model.number="defaults.concurrency" type="number" min="1" class="input" />
        </div>
        <div>
          <label class="label">Tamper %</label>
          <input v-model.number="defaults.tamperPercent" type="number" min="0" max="100" class="input" />
        </div>
      </div>

      <div style="margin-top:14px">
        <label class="label">Run Label (optional)</label>
        <input v-model="label" class="input" placeholder="e.g. baseline_2025_05" />
      </div>
    </div>

    <!-- Cell picker -->
    <div class="card" style="margin-bottom:20px">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px; flex-wrap:wrap">
        <p class="section-title" style="margin:0">Cells <span style="color:#3fb950">{{ selectedCount }}</span> / {{ allCells.length }}</p>
        <button class="btn btn-ghost btn-xs" @click="selectAll">All</button>
        <button class="btn btn-ghost btn-xs" @click="selectNone">None</button>
        <button class="btn btn-ghost btn-xs" @click="selectByMode('sync')">Sync</button>
        <button class="btn btn-ghost btn-xs" @click="selectByMode('async')">Async</button>
        <button class="btn btn-ghost btn-xs" @click="selectByMode('batch')">Batch</button>
        <span style="margin-left:auto; display:flex; gap:10px; align-items:center">
          <button class="btn btn-danger" :disabled="running || resetting" @click="resetDb" title="Drop all log tables in PG + Mongo (chain data is immutable)">
            <span v-if="resetting">⏳ Resetting…</span>
            <span v-else>🗑 Reset DB</span>
          </button>
          <button class="btn btn-primary" :disabled="running || selectedCount === 0" @click="run">
            <span v-if="running">⏳ {{ progress.current }} / {{ progress.total }}</span>
            <span v-else>▶ Run {{ selectedCount }} Selected</span>
          </button>
        </span>
      </div>

      <div class="cell-table">
        <div class="cell-head">
          <span style="width:30px"></span>
          <span style="flex:1">Strategy</span>
          <span style="width:170px">Backend</span>
          <span style="width:80px">Mode</span>
          <span style="width:120px; text-align:center">Batch Size</span>
        </div>
        <div
          v-for="(c, i) in allCells" :key="i"
          class="cell-row"
          :class="{ active: c.selected, batch: c.mode === 'batch' }"
          @click="c.selected = !c.selected"
        >
          <span style="width:30px">
            <input type="checkbox" v-model="c.selected" @click.stop>
          </span>
          <span style="flex:1; font-family:'SF Mono',monospace; font-size:12px">{{ c.strategy }}</span>
          <span style="width:170px; display:flex; gap:4px; flex-wrap:wrap">
            <span v-if="c.db" class="db-pill" :class="c.db === 'mongo' ? 'db-mongo' : 'db-pg'">
              {{ c.db === 'mongo' ? 'Mongo' : 'PG' }}
            </span>
            <span v-if="c.chain" class="chain-pill" :class="c.chain === 'exonum' ? 'chain-exo' : 'chain-eth'">
              {{ c.chain === 'exonum' ? 'Exonum' : 'Ethereum' }}
            </span>
          </span>
          <span style="width:80px">
            <span class="mode-pill" :class="`mode-${c.mode}`">{{ c.mode }}</span>
          </span>
          <span style="width:120px; text-align:center">
            <input
              v-if="c.mode === 'batch'"
              v-model.number="c.batchSize"
              type="number" min="1"
              class="input mono-sm"
              :class="{ 'input-required': c.selected && !c.batchSize }"
              @click.stop
              placeholder="required"
            />
            <span v-else style="color:#30363d; font-size:11px">—</span>
          </span>
        </div>
      </div>

      <div v-if="error" class="err-box">{{ error }}</div>

      <div v-if="running || progress.current > 0" class="progress-track">
        <div class="progress-bar" :style="{ width: progressPct + '%' }"></div>
      </div>

      <div v-if="status" style="margin-top:10px; font-size:12px; color:#8b949e">
        Status: <strong :class="statusClass">{{ status }}</strong>
      </div>
    </div>

    <!-- Reports -->
    <div v-if="finishedRun && (finishedRun.jsonPath || finishedRun.csvPath)" class="card" style="margin-bottom:20px">
      <p class="section-title">Reports</p>
      <div style="display:flex; gap:12px">
        <a v-if="finishedRun.csvPath"  :href="`/experiment/download/${finishedRun.csvPath}`"  class="btn btn-primary" download>📊 Download CSV</a>
        <a v-if="finishedRun.jsonPath" :href="`/experiment/download/${finishedRun.jsonPath}`" class="btn btn-ghost"   download>📄 Download JSON</a>
      </div>
    </div>

    <!-- Results -->
    <div v-if="results.length" class="card">
      <p class="section-title">Results <span style="color:#3fb950">({{ results.length }})</span></p>
      <div class="table-scroll">
        <table class="results-table">
          <thead>
            <tr>
              <th style="width:30px"></th>
              <th>Strategy</th>
              <th>Mode</th>
              <th>Throughput<br><small>logs/s</small></th>
              <th>Avg Lat<br><small>ms</small></th>
              <th>p95<br><small>ms</small></th>
              <th>BC Confirm<br><small>ms</small></th>
              <th>Anchor Delay<br><small>ms</small></th>
              <th>Verify<br><small>ms</small></th>
              <th>Storage<br><small>KB</small></th>
              <th>Tamper<br><small>%</small></th>
              <th>Exposure<br><small>ms</small></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(r, i) in results" :key="i">
              <tr class="row-main" :class="{ open: expanded[i] }" @click="toggleExpand(i)">
                <td><span class="caret">{{ expanded[i] ? '▾' : '▸' }}</span></td>
                <td><span class="strat-pill">{{ r.strategy }}</span></td>
                <td>{{ r.mode }}</td>
                <td class="num">{{ r.throughputPerSecond.toFixed(1) }}</td>
                <td class="num">{{ r.avgLatencyMs.toFixed(1) }}</td>
                <td class="num">{{ r.p95LatencyMs.toFixed(1) }}</td>
                <td class="num">{{ r.blockchainConfirmationTimeMs.toFixed(0) }}</td>
                <td class="num">{{ r.hashAnchoringDelayMs.toFixed(1) }}</td>
                <td class="num">{{ r.integrityVerificationTimeMs.toFixed(1) }}</td>
                <td class="num">{{ (r.storageOverheadBytes / 1024).toFixed(1) }}</td>
                <td class="num" :class="r.tamperDetectionRatePercent >= 100 ? 'ok' : (r.tamperDetectionRatePercent === 0 ? 'err' : '')">
                  {{ r.tamperDetectionRatePercent.toFixed(0) }}
                </td>
                <td class="num">{{ r.integrityExposureWindowMs.toFixed(0) }}</td>
              </tr>
              <tr v-if="expanded[i]" class="row-detail">
                <td colspan="12">
                  <div class="tamper-block">
                    <div class="tamper-header">
                      Tampered samples
                      <span style="margin-left:8px; color:#8b949e">
                        {{ r.detectedSamples }}/{{ r.tamperedSamples }} detected
                        ({{ r.tamperPercent }}% of {{ r.successCount }} writes)
                      </span>
                    </div>
                    <div v-if="!r.tamperedLogs || r.tamperedLogs.length === 0" class="tamper-empty">
                      No tamper samples recorded for this cell.
                    </div>
                    <div v-else>
                      <div v-for="(t, j) in r.tamperedLogs" :key="j" class="tamper-row">
                        <div class="tamper-meta">
                          <span class="mono-id">{{ t.id.slice(0, 8) }}…</span>
                          <span v-if="t.tamperType === 'not-applicable'" class="tag-na">N/A — chain immutable</span>
                          <span v-else-if="t.detected" class="tag-detected">✓ Detected</span>
                          <span v-else class="tag-missed">✗ Missed</span>
                          <span class="tamper-detail">{{ t.verifyDetails }}</span>
                        </div>
                        <div class="tamper-diff" v-if="t.tamperType !== 'not-applicable'">
                          <div class="diff-line before">
                            <span class="diff-label">before</span>
                            <span class="diff-text">{{ t.beforeMessage }}</span>
                          </div>
                          <div class="diff-line after">
                            <span class="diff-label">after</span>
                            <span class="diff-text">{{ t.afterMessage }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onUnmounted } from 'vue'
import axios from 'axios'

// 8 architectures × 3 modes = 24 cells. User picks any subset.
// db = null for chain-only; chain = null for db-only — UI hides whichever is null.
const ARCHS = [
  { strategy: 'database_only',  db: 'postgres', chain: null       },
  { strategy: 'database_only',  db: 'mongo',    chain: null       },
  { strategy: 'private_chain',  db: null,       chain: 'exonum'   },
  { strategy: 'public_chain',   db: null,       chain: 'ethereum' },
  { strategy: 'hybrid_private', db: 'postgres', chain: 'exonum'   },
  { strategy: 'hybrid_private', db: 'mongo',    chain: 'exonum'   },
  { strategy: 'hybrid_public',  db: 'postgres', chain: 'ethereum' },
  { strategy: 'hybrid_public',  db: 'mongo',    chain: 'ethereum' },
]
const MODES = ['sync', 'async', 'batch']

const defaults = reactive({
  totalWrites:   20,
  concurrency:   5,
  tamperPercent: 10,
})
const label = ref('')

function buildCells() {
  const out = []
  for (const a of ARCHS) {
    for (const m of MODES) {
      out.push({
        strategy:  a.strategy,
        db:        a.db,
        chain:     a.chain,
        mode:      m,
        selected:  false,
        batchSize: null,
      })
    }
  }
  return out
}

const allCells = reactive(buildCells())
const expanded = reactive({})

function toggleExpand(i) {
  expanded[i] = !expanded[i]
}

const selectedCount = computed(() => allCells.filter((c) => c.selected).length)

function selectAll()  { allCells.forEach((c) => c.selected = true)  }
function selectNone() { allCells.forEach((c) => c.selected = false) }
function selectByMode(m) {
  allCells.forEach((c) => { c.selected = c.mode === m })
}

const running     = ref(false)
const resetting   = ref(false)
const status      = ref('')
const error       = ref('')
const results     = ref([])
const finishedRun = ref(null)
const progress    = reactive({ current: 0, total: 0 })

async function resetDb() {
  if (!confirm('Drop and recreate all log tables (PG + Mongo)?\n\nChain data is unaffected — this only clears the off-chain DB.')) return
  resetting.value = true
  error.value     = ''
  try {
    const r = await axios.post('/experiment/reset-db')
    status.value = `DB reset (PG: ${r.data.postgres ? '✓' : '✗'}, Mongo: ${r.data.mongo ? '✓' : 'unavailable'})`
  } catch (e) {
    error.value = e.response?.data?.error ?? e.message
  } finally {
    resetting.value = false
  }
}

let pollTimer = null

const progressPct = computed(() => {
  if (progress.total === 0) return 0
  return Math.round((progress.current / progress.total) * 100)
})

const statusClass = computed(() => {
  if (status.value === 'done')  return 'ok'
  if (status.value === 'error') return 'err'
  return ''
})

async function run() {
  const picked = allCells.filter((c) => c.selected)
  if (picked.length === 0) return

  // Batch cells must specify their own batch size — there's no global fallback.
  const missing = picked.filter((c) => c.mode === 'batch' && (!c.batchSize || c.batchSize < 1))
  if (missing.length > 0) {
    error.value = `Batch size required for ${missing.length} batch cell${missing.length > 1 ? 's' : ''}.`
    return
  }

  running.value = true
  status.value  = 'starting'
  error.value   = ''
  results.value = []
  finishedRun.value = null
  progress.current = 0
  progress.total   = picked.length

  const payload = {
    cells: picked.map((c) => ({
      strategy: c.strategy,
      // Chain-only strategies don't read/write the DB; backend still requires
      // a value to pick the right adapter, so default to postgres in that case.
      db:       c.db ?? 'postgres',
      mode:     c.mode,
      ...(c.mode === 'batch' ? { batchSize: c.batchSize } : {}),
    })),
    totalWrites:   defaults.totalWrites,
    concurrency:   defaults.concurrency,
    tamperPercent: defaults.tamperPercent,
    label:         label.value || undefined,
  }

  try {
    const r = await axios.post('/experiment/run-suite', payload)
    pollProgress(r.data.runId)
  } catch (e) {
    error.value = e.response?.data?.error ?? e.message
    running.value = false
    status.value  = 'error'
  }
}

function pollProgress(runId) {
  status.value = 'running'
  pollTimer = setInterval(async () => {
    try {
      const r = await axios.get(`/experiment/run-suite/${runId}`)
      progress.current = r.data.current
      progress.total   = r.data.total
      results.value    = r.data.results
      if (r.data.status !== 'running') {
        clearInterval(pollTimer)
        pollTimer = null
        running.value = false
        status.value  = r.data.status
        if (r.data.status === 'error') error.value = r.data.error
        if (r.data.status === 'done')  finishedRun.value = r.data
      }
    } catch (e) {
      clearInterval(pollTimer)
      pollTimer = null
      running.value = false
      status.value  = 'error'
      error.value   = e.message
    }
  }, 2000)
}

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped>
.row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
.row-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 14px; }

.btn-xs { padding: 4px 10px; font-size: 12px; }

.cell-table { display: flex; flex-direction: column; gap: 1px; background: #21262d; border-radius: 6px; overflow: hidden; }
.cell-head, .cell-row {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 12px; background: #0d1117;
}
.cell-head {
  font-size: 11px; color: #8b949e;
  text-transform: uppercase; letter-spacing: .04em;
  border-bottom: 1px solid #21262d;
}
.cell-row {
  cursor: pointer; transition: background .1s;
  font-size: 13px; color: #e2e8f0;
}
.cell-row:hover { background: #161b22; }
.cell-row.active { background: #0c2a4a; }
.cell-row.active.batch { background: #2d1e00; }

.db-pill, .chain-pill { font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 10px; white-space: nowrap; }
.db-pg    { background: #1a2d4a; color: #58a6ff; }
.db-mongo { background: #1a3a1a; color: #3fb950; }
.chain-exo { background: #2d1e3d; color: #d2a8ff; }
.chain-eth { background: #3d2c0c; color: #ffa657; }

.mode-pill { font-size: 11px; padding: 2px 7px; border-radius: 10px; font-weight: 600; }
.mode-sync  { background: #21262d; color: #8b949e; }
.mode-async { background: #1a2d4a; color: #58a6ff; }
.mode-batch { background: #2d1e00; color: #e3b341; }

.mono-sm {
  width: 80px; padding: 4px 8px; font-size: 12px;
  font-family: 'SF Mono', monospace; text-align: center;
}
.mono-sm.input-required { border-color: #f85149; }

.err-box {
  margin-top: 12px; padding: 12px; background: #3d0c0c;
  border-radius: 6px; font-size: 13px; color: #f85149;
}

.progress-track {
  margin-top: 14px; height: 6px; background: #21262d;
  border-radius: 99px; overflow: hidden;
}
.progress-bar {
  height: 100%; background: linear-gradient(90deg, #1f6feb, #58a6ff);
  transition: width .3s ease;
}

.table-scroll { overflow-x: auto; }
.results-table { width: 100%; border-collapse: collapse; font-size: 12px; font-family: 'SF Mono', monospace; }
.results-table th {
  text-align: left; padding: 8px 10px; font-weight: 600;
  color: #8b949e; text-transform: uppercase; letter-spacing: .04em;
  border-bottom: 1px solid #30363d; white-space: nowrap;
  font-family: inherit;
}
.results-table td { padding: 8px 10px; border-bottom: 1px solid #21262d; color: #e2e8f0; }
.results-table td.num { text-align: right; }
.results-table td.ok  { color: #3fb950; font-weight: 600; }
.results-table td.err { color: #f85149; font-weight: 600; }
.results-table small  { font-weight: 400; opacity: .7; }
.strat-pill { display: inline-block; padding: 2px 7px; background: #21262d; border-radius: 10px; font-size: 11px; font-family: inherit; }

.row-main { cursor: pointer; }
.row-main:hover td { background: #161b22; }
.row-main.open td { background: #0c2a4a; }
.caret { color: #58a6ff; font-size: 11px; }

.row-detail td { padding: 0; background: #0d1117 !important; }
.tamper-block { padding: 14px 18px; }
.tamper-header {
  font-size: 11px; color: #58a6ff; font-weight: 700;
  text-transform: uppercase; letter-spacing: .04em;
  margin-bottom: 10px;
}
.tamper-empty { font-size: 12px; color: #8b949e; padding: 6px 0; }
.tamper-row {
  background: #161b22; border-radius: 6px; padding: 8px 12px;
  margin-bottom: 6px;
}
.tamper-meta {
  display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
  font-size: 11px;
}
.mono-id { font-family: 'SF Mono', monospace; color: #58a6ff; }
.tag-detected, .tag-missed, .tag-na {
  padding: 2px 7px; border-radius: 99px; font-weight: 600;
}
.tag-detected { background: #0c2d1e; color: #3fb950; }
.tag-missed   { background: #3d0c0c; color: #f85149; }
.tag-na       { background: #2d1e00; color: #e3b341; }
.tamper-detail { color: #8b949e; flex: 1; }
.tamper-diff { margin-top: 6px; display: flex; flex-direction: column; gap: 3px; }
.diff-line {
  display: flex; gap: 10px; padding: 5px 8px; border-radius: 4px;
  font-family: 'SF Mono', monospace; font-size: 11px;
}
.diff-line.before { background: rgba(248, 81, 73, 0.08); color: #f85149; }
.diff-line.after  { background: rgba(63, 185, 80, 0.08); color: #3fb950; }
.diff-label {
  width: 50px; flex-shrink: 0; font-weight: 700;
  text-transform: uppercase; font-size: 10px; opacity: .7;
}
.diff-text { word-break: break-all; }

.section-title { color: #8b949e; }
:global(.ok)  { color: #3fb950 !important; }
:global(.err) { color: #f85149 !important; }
</style>

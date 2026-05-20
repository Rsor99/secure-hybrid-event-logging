<template>
  <teleport to="body">
    <div v-if="log" class="overlay" @click.self="$emit('close')">
      <div class="modal">
        <div class="modal-header">
          <span class="tag" :class="`tag-${log.level?.toLowerCase()}`">{{ log.level }}</span>
          <span class="modal-source">{{ log.source }}</span>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>

        <div class="modal-body">
          <div class="field">
            <div class="key">Message</div>
            <div class="val text">{{ log.message }}</div>
          </div>

          <div class="row2">
            <div class="field">
              <div class="key">ID</div>
              <div class="val mono copyable" @click="copy(log.id)" title="Click to copy">{{ log.id }}</div>
            </div>
            <div class="field">
              <div class="key">Timestamp</div>
              <div class="val text">{{ fmtTime(log.timestamp) }}</div>
            </div>
          </div>

          <div v-if="log.metadata && Object.keys(log.metadata).length" class="field">
            <div class="key">Metadata</div>
            <div class="val mono">{{ JSON.stringify(log.metadata, null, 2) }}</div>
          </div>

          <!-- blockchain section -->
          <template v-if="log.dataHash || log.blockchainTxId">
            <div class="divider">Blockchain Anchor</div>

            <div v-if="log.dataHash" class="field">
              <div class="key">Content Hash (SHA-256)</div>
              <div class="val mono copyable" @click="copy(log.dataHash)" title="Click to copy">{{ log.dataHash }}</div>
            </div>

            <div class="row2">
              <div v-if="log.blockchainTxId" class="field">
                <div class="key">Tx ID</div>
                <div class="val mono copyable" @click="copy(log.blockchainTxId)" title="Click to copy">
                  {{ log.blockchainTxId?.slice(0, 20) }}…
                </div>
              </div>
              <div class="field">
                <div class="key">Anchor Status</div>
                <div class="val text">
                  <span v-if="log.blockchainConfirmed" style="color:#3fb950">⛓ Confirmed</span>
                  <span v-else-if="log.blockchainTxId"  style="color:#e3b341">⏳ Pending</span>
                  <span v-else                           style="color:#8b949e">— Not anchored</span>
                </div>
              </div>
            </div>

            <div v-if="log.storageMode" class="field">
              <div class="key">Storage Mode</div>
              <div class="val text">{{ log.storageMode }}</div>
            </div>

            <!-- etherscan link for ethereum tx -->
            <a
              v-if="log.blockchainTxId && isEthTx(log.blockchainTxId)"
              :href="`https://sepolia.etherscan.io/tx/${log.blockchainTxId}`"
              target="_blank"
              class="ext-link"
            >
              View on Etherscan ↗
            </a>
          </template>

          <!-- verify section -->
          <div class="divider" style="margin-top:4px">Integrity Verification</div>
          <button class="btn btn-ghost" style="align-self:flex-start" :disabled="verifying" @click="runVerify">
            {{ verifying ? 'Verifying…' : '🔍 Verify' }}
          </button>

          <div v-if="verifyResult" class="verify-result" :class="verifyResult.valid ? 'ok' : 'fail'">
            <span class="verify-icon">{{ verifyResult.valid ? '✅' : '❌' }}</span>
            <div class="verify-body">
              <div class="verify-title">{{ verifyResult.valid ? 'Verified' : 'Verification Failed' }}</div>
              <div class="verify-detail">{{ verifyResult.details }}</div>
              <div v-if="verifyResult.merkleMatch !== null && verifyResult.merkleMatch !== undefined" class="verify-detail">
                Merkle: {{ verifyResult.merkleMatch ? '✅ leaf included in batch root' : '❌ not in Merkle tree' }}
                <span v-if="verifyResult.leafIndex !== undefined"> · leaf #{{ verifyResult.leafIndex }}</span>
              </div>
            </div>
          </div>

          <div v-if="verifyError" class="verify-result fail">
            <span class="verify-icon">⚠️</span>
            <div class="verify-body"><div class="verify-detail">{{ verifyError }}</div></div>
          </div>

          <div v-if="copied" class="copy-toast">Copied!</div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import axios from 'axios'

const props = defineProps({ log: Object, db: { type: String, default: 'postgres' } })
defineEmits(['close'])

const copied       = ref(false)
const verifying    = ref(false)
const verifyResult = ref(null)
const verifyError  = ref('')

watch(() => props.log, () => {
  verifyResult.value = null
  verifyError.value  = ''
  verifying.value    = false
  copied.value       = false
})

async function runVerify() {
  verifyResult.value = null
  verifyError.value  = ''
  verifying.value    = true
  try {
    const isBatch = props.log?.batchRoot !== undefined && props.log?.batchRoot !== null
    const endpoint = isBatch ? `/verify-batch/${props.log.id}` : `/verify/${props.log.id}`
    const params = { db: props.db }
    // Batch verification needs to know which table to look in
    if (props.log?.chain) params.chain = props.log.chain
    const res = await axios.get(endpoint, { params })
    verifyResult.value = res.data
  } catch (e) {
    verifyError.value = e.response?.data?.error ?? e.message
  } finally {
    verifying.value = false
  }
}

function fmtTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'medium' })
}

function isEthTx(txId) {
  return txId?.startsWith('0x') && txId.length === 66
}

function copy(v) {
  navigator.clipboard?.writeText(v)
  copied.value = true
  setTimeout(() => copied.value = false, 1500)
}
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.65);
  z-index: 200; display: flex; align-items: center; justify-content: center;
}
.modal {
  background: #161b22; border: 1px solid #30363d; border-radius: 12px;
  width: 640px; max-width: 95vw; max-height: 85vh; overflow-y: auto;
}
.modal-header {
  display: flex; align-items: center; gap: 10px;
  padding: 16px 20px; border-bottom: 1px solid #30363d; position: sticky; top: 0;
  background: #161b22; z-index: 1;
}
.modal-source { font-size: 13px; color: #8b949e; flex: 1; }
.close-btn {
  background: none; border: none; color: #8b949e; font-size: 18px;
  cursor: pointer; line-height: 1; padding: 0 4px;
}
.close-btn:hover { color: #e2e8f0; }

.modal-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; position: relative; }

.field { display: flex; flex-direction: column; gap: 4px; }
.key { font-size: 11px; color: #8b949e; text-transform: uppercase; letter-spacing: .05em; }
.val {
  font-size: 13px; background: #0d1117; border-radius: 6px;
  padding: 8px 10px; word-break: break-all;
}
.val.mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; white-space: pre-wrap; }
.val.text { font-family: inherit; }
.copyable { cursor: pointer; color: #58a6ff; }
.copyable:hover { text-decoration: underline; }

.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

.divider {
  font-size: 11px; color: #58a6ff; text-transform: uppercase;
  letter-spacing: .06em; padding-bottom: 4px;
  border-bottom: 1px solid #1a2d4a; margin-top: 4px;
}

.ext-link {
  display: inline-flex; align-items: center; gap: 4px;
  color: #58a6ff; font-size: 13px; text-decoration: none;
}
.ext-link:hover { text-decoration: underline; }

.copy-toast {
  position: absolute; bottom: 16px; right: 20px;
  background: #238636; color: #fff; font-size: 12px;
  padding: 4px 12px; border-radius: 99px;
}
.verify-result {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 12px 14px; border-radius: 8px;
}
.verify-result.ok   { background: #0c2d1e; border: 1px solid #238636; }
.verify-result.fail { background: #3d0c0c; border: 1px solid #b91c1c; }
.verify-icon { font-size: 20px; line-height: 1.4; }
.verify-body { display: flex; flex-direction: column; gap: 4px; }
.verify-title  { font-size: 14px; font-weight: 600; color: #e2e8f0; }
.verify-detail { font-size: 12px; color: #8b949e; }
</style>

<template>
  <div>
    <div class="card">
      <p class="section-title">Verify Log Entry</p>
      <p style="font-size:13px; color:#8b949e; margin-bottom:16px">
        Paste a log ID (UUID) returned when you sent a log to check if it's intact and anchored.
      </p>

      <div style="display:flex; gap:10px">
        <input
          v-model="logId"
          class="input mono"
          placeholder="e.g. 3f2504e0-4f89-11d3-9a0c-0305e82c3301"
          style="flex:1"
          @keydown.enter="verify"
        />
        <button class="btn btn-primary" :disabled="!logId.trim() || loading" @click="verify">
          {{ loading ? 'Verifying…' : 'Verify' }}
        </button>
      </div>
    </div>

    <!-- Result -->
    <div v-if="result" class="card" style="margin-top:20px">
      <div class="result-header">
        <span class="result-icon">{{ result.valid ? '✅' : '❌' }}</span>
        <span class="result-title" :class="result.valid ? 'ok' : 'fail'">
          {{ result.valid ? 'Log is valid' : 'Verification failed' }}
        </span>
        <span class="mono" style="color:#8b949e; font-size:12px; margin-left:auto">
          {{ result.verificationTimeMs }}ms
        </span>
      </div>

      <div class="result-fields">
        <div class="result-field">
          <span class="result-key">Log ID</span>
          <span class="mono result-val">{{ result.logId }}</span>
        </div>
        <div class="result-field">
          <span class="result-key">Details</span>
          <span class="result-val">{{ result.details }}</span>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="card" style="margin-top:20px; border-color:#f85149">
      <p style="color:#f85149; font-size:14px">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import axios from 'axios'

const dbBackend = inject('dbBackend', ref('postgres'))

const logId   = ref('')
const loading = ref(false)
const result  = ref(null)
const error   = ref('')

async function verify() {
  if (!logId.value.trim()) return
  loading.value = true
  result.value  = null
  error.value   = ''
  try {
    const res = await axios.get(`/verify/${logId.value.trim()}`, { params: { db: dbBackend.value } })
    result.value = res.data
  } catch (e) {
    error.value = e.response?.data?.error ?? e.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.result-header {
  display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
}
.result-icon  { font-size: 24px; }
.result-title { font-size: 18px; font-weight: 700; }
.result-title.ok   { color: #3fb950; }
.result-title.fail { color: #f85149; }

.result-fields { display: flex; flex-direction: column; gap: 12px; }
.result-field  { display: flex; flex-direction: column; gap: 4px; }
.result-key    { font-size: 12px; color: #8b949e; text-transform: uppercase; letter-spacing: .05em; }
.result-val    { font-size: 14px; color: #e2e8f0; word-break: break-all; }
</style>

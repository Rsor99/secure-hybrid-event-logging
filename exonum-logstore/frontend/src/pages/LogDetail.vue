<template>
  <div>
    <navbar />
    <div class="container mt-4">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><router-link :to="{ name: 'dashboard' }">Dashboard</router-link></li>
          <li class="breadcrumb-item"><router-link :to="{ name: 'logs-list' }">Logs</router-link></li>
          <li class="breadcrumb-item active">{{ hash.slice(0, 12) }}…</li>
        </ol>
      </nav>

      <div class="card">
        <div class="card-header font-weight-bold d-flex align-items-center">
          Log Record
          <span class="badge badge-primary ml-2">Blockchain-only (full log on-chain)</span>
        </div>
        <ul v-if="info" class="list-group list-group-flush">

          <li class="list-group-item">
            <strong>Content hash:</strong><br>
            <code class="small">{{ hash }}</code>
            <div class="text-muted small mt-1">SHA256 of canonical JSON: <code>{id, timestamp, level, source, message, metadata}</code></div>
          </li>

          <li class="list-group-item">
            <strong>Storage mode:</strong> Full log stored on-chain<br>
            <span class="text-muted small">Scalability note: highest storage cost — used as baseline in this research.</span>
          </li>

          <li class="list-group-item">
            <strong>Verification:</strong>
            <table class="table table-sm table-borderless mb-0 mt-1">
              <tbody>
                <tr>
                  <td class="py-0 pl-0 w-50">On-chain record</td>
                  <td class="py-0">
                    <span v-if="info.record" class="badge badge-success">✅ Found</span>
                    <span v-else class="badge badge-secondary">Not found</span>
                  </td>
                </tr>
                <tr>
                  <td class="py-0 pl-0">State proof</td>
                  <td class="py-0">
                    <span v-if="info.verified" class="badge badge-success">✅ Valid</span>
                    <span v-else-if="info.record" class="badge badge-danger">❌ Failed</span>
                    <span v-else class="badge badge-secondary">N/A</span>
                  </td>
                </tr>
                <tr>
                  <td class="py-0 pl-0">Log inclusion proof</td>
                  <td class="py-0">
                    <span class="badge badge-secondary">N/A — full log stored directly on-chain</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </li>

          <template v-if="info.record">
            <li class="list-group-item">
              <strong>Level:</strong> <code>{{ info.record.level }}</code>
              &nbsp;&nbsp;
              <strong>Source:</strong> <code>{{ info.record.source }}</code>
            </li>
            <li class="list-group-item">
              <strong>Message:</strong><br>
              {{ info.record.message || info.record.message_preview }}
            </li>
            <li v-if="info.record.metadata_json && info.record.metadata_json !== '{}'" class="list-group-item">
              <strong>Metadata:</strong>
              <pre class="mt-1 small mb-0"><code>{{ formatJson(info.record.metadata_json) }}</code></pre>
            </li>

            <li class="list-group-item">
              <strong>Submitter history:</strong>
              <div class="ml-3 mt-1 small">
                <div>Length: {{ info.record.history_len }}</div>
                <div>Running history hash:<br>
                  <code class="small">{{ formatHash(info.record.history_hash) }}</code>
                </div>
                <div class="text-muted mt-1">Running history hash links this submitter's previous anchors in order. It is not the state root.</div>
              </div>
            </li>
          </template>

          <li class="list-group-item">
            <strong>Blockchain:</strong>
            <div class="ml-3 mt-1 small">
              <div v-if="info.commitBlockHeight != null">
                Committed in block:
                <router-link :to="{ name: 'block', params: { height: String(info.commitBlockHeight) } }">
                  #{{ info.commitBlockHeight }}
                </router-link>
              </div>
              <div v-if="info.record && info.record.tx_hash">
                Transaction hash:
                <router-link :to="{ name: 'transaction', params: { hash: info.record.tx_hash } }">
                  <code>{{ info.record.tx_hash.slice(0, 20) }}…</code>
                </router-link>
              </div>
              <div v-if="info.block">
                State proof block:
                <router-link :to="{ name: 'block', params: { height: info.block.height } }">
                  #{{ info.block.height }}
                </router-link>
                <span class="text-muted ml-1">(latest state used for verification)</span>
              </div>
              <div v-if="info.merkleRoot">
                State root:<br>
                <code class="small">{{ info.merkleRoot }}</code>
              </div>
            </div>
          </li>
        </ul>
        <div v-else-if="!loading" class="card-body text-muted">Loading proof…</div>
      </div>

      <div v-if="info && info.verified" class="alert alert-success mt-3">
        <strong>Cryptographic proof verified.</strong> The full log record exists in the Exonum
        <code>logs</code> state tree as of the block shown above. The block is signed by the
        validator set, proving the data has not been tampered with.
      </div>
      <div v-else-if="info && !info.verified" class="alert alert-warning mt-3">
        Hash not found in the <code>logs</code> map. It may be stored as a hash anchor —
        <router-link :to="{ name: 'dashboard' }">try verifying on the Dashboard</router-link>.
      </div>
    </div>
    <spinner :visible="loading" />
  </div>
</template>

<script>
import Navbar from '../components/Navbar.vue'
import Spinner from '../components/Spinner.vue'

export default {
  components: { Navbar, Spinner },
  props: { hash: { type: String, default: '' } },
  data () { return { info: null, loading: false } },
  mounted () { if (this.hash) this.load() },
  methods: {
    async load () {
      this.loading = true
      try {
        this.info = await this.$blockchain.verifyLog(this.hash)
      } catch (e) {
        this.$notify('error', e.toString())
      } finally {
        this.loading = false
      }
    },
    formatHash (h) {
      if (!h) return '—'
      if (typeof h === 'string') return h
      if (h.data) return Array.from(h.data).map(b => b.toString(16).padStart(2, '0')).join('')
      return '—'
    },
    formatJson (s) {
      try { return JSON.stringify(JSON.parse(s), null, 2) } catch { return s }
    }
  }
}
</script>

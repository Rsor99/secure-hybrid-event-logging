<template>
  <div>
    <navbar />
    <div class="container mt-4">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><router-link :to="{ name: 'dashboard' }">Dashboard</router-link></li>
          <li class="breadcrumb-item"><router-link :to="{ name: 'hashes-list' }">Hashes</router-link></li>
          <li class="breadcrumb-item active">{{ hash.slice(0, 12) }}…</li>
        </ol>
      </nav>

      <div class="card">
        <div class="card-header font-weight-bold d-flex align-items-center">
          Hash Anchor Record
          <span class="badge badge-secondary ml-2">Hybrid single (hash on-chain)</span>
        </div>
        <ul v-if="info" class="list-group list-group-flush">

          <li class="list-group-item">
            <strong>Content hash:</strong><br>
            <code class="small">{{ hash }}</code>
            <div class="text-muted small mt-1">SHA256 of canonical JSON: <code>{id, timestamp, level, source, message, metadata}</code></div>
          </li>

          <li class="list-group-item">
            <strong>Storage mode:</strong> Hash on-chain, full log off-chain (DB)
          </li>

          <li class="list-group-item">
            <strong>Verification:</strong>
            <table class="table table-sm table-borderless mb-0 mt-1">
              <tbody>
                <tr>
                  <td class="py-0 pl-0 w-50">On-chain hash anchor</td>
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
                  <td class="py-0 pl-0">Off-chain log hash match</td>
                  <td class="py-0">
                    <span v-if="offChain === null" class="badge badge-light border">Checking…</span>
                    <span v-else-if="offChain.match" class="badge badge-success">✅ Valid <span class="font-weight-normal">(recomputed SHA256 of canonical JSON matches on-chain hash)</span></span>
                    <span v-else-if="offChain && offChain.found_in_db === false" class="badge badge-warning">⚠ Not found in off-chain DB</span>
                    <span v-else class="badge badge-danger">❌ Hash mismatch</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </li>

          <template v-if="info.record">
            <li class="list-group-item">
              <strong>On-chain metadata:</strong>
              <div class="ml-3 mt-1 small">
                <div>Level: <code>{{ info.record.level }}</code></div>
                <div>Message preview (on-chain): {{ info.record.message_preview }}</div>
              </div>
            </li>

            <li class="list-group-item">
              <strong>Off-chain data (DB):</strong>
              <div class="ml-3 mt-1 small">
                <div v-if="offChain && offChain.found_in_db">
                  <div>Status: <span class="badge badge-success">Found</span></div>
                  <div class="text-muted mt-1">Full message and metadata are stored in the off-chain DB only.</div>
                </div>
                <div v-else class="text-muted">Full message and metadata stored in the off-chain DB.</div>
              </div>
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

      <div v-if="info && info.verified && offChain && offChain.match" class="alert alert-success mt-3">
        <strong>Cryptographic proof verified.</strong> The content hash exists in the Exonum
        <code>hashes</code> state tree and is signed by the validator set. The log was retrieved
        from the off-chain DB and its recomputed SHA256 matches the on-chain anchor — confirming data integrity.
      </div>
      <div v-else-if="info && info.verified && offChain && !offChain.match" class="alert alert-warning mt-3">
        <strong>On-chain proof valid</strong> — but the off-chain log hash does not match or was not found in the DB.
        The anchor is cryptographically sound; the off-chain data may have been modified or not yet synced.
      </div>
      <div v-else-if="info && !info.verified" class="alert alert-warning mt-3">
        Hash not found in the <code>hashes</code> map. It may be a full log instead —
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
  data () { return { info: null, offChain: null, loading: false } },
  mounted () { if (this.hash) this.load() },
  methods: {
    async load () {
      this.loading = true
      this.offChain = null
      try {
        this.info = await this.$blockchain.verifyHash(this.hash)
        if (this.info.record) {
          this.offChain = await this.$blockchain.verifyOffChainHash(this.hash)
        }
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
    }
  }
}
</script>

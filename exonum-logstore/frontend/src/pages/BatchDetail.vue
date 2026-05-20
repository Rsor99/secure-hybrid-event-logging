<template>
  <div>
    <navbar />
    <div class="container mt-4">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><router-link :to="{ name: 'dashboard' }">Dashboard</router-link></li>
          <li class="breadcrumb-item"><router-link :to="{ name: 'batches-list' }">Batches</router-link></li>
          <li class="breadcrumb-item active">{{ hash.slice(0, 12) }}…</li>
        </ol>
      </nav>

      <div class="card">
        <div class="card-header font-weight-bold d-flex align-items-center">
          Batch Anchor Record
          <span class="badge badge-warning ml-2">Hybrid batch (Merkle root on-chain)</span>
        </div>
        <ul v-if="info" class="list-group list-group-flush">

          <li class="list-group-item">
            <strong>Batch Merkle root:</strong><br>
            <code class="small">{{ hash }}</code>
            <div class="text-muted small mt-1">
              Binary Merkle tree of {{ info.record && info.record.count }} log content hashes.
              Algorithm: SHA256, left-right concatenation, last node duplicated if count is odd.
            </div>
          </li>

          <li class="list-group-item">
            <strong>Storage mode:</strong> Batch Merkle root on-chain, full logs off-chain (DB)
          </li>

          <li class="list-group-item">
            <strong>Verification:</strong>
            <table class="table table-sm table-borderless mb-0 mt-1">
              <tbody>
                <tr>
                  <td class="py-0 pl-0 w-50">Batch anchor</td>
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
                  <td class="py-0 pl-0">Batch root in Exonum state</td>
                  <td class="py-0">
                    <span v-if="info.verified" class="badge badge-success">✅ Valid <span class="font-weight-normal">(Exonum MerkleDB MapProof)</span></span>
                    <span v-else class="badge badge-secondary">N/A</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="text-muted small mt-2 ml-1">
              The state proof verifies that the Merkle root is committed in the validator-signed block.
              Per-log inclusion (leaf → root path) can be verified off-chain by recomputing the tree from off-chain DB data.
            </div>
          </li>

          <template v-if="info.record">
            <li class="list-group-item">
              <strong>Batch summary:</strong>
              <div class="ml-3 mt-1 small">
                <div>Batch size: <strong>{{ info.record.count }} logs</strong></div>
                <div class="mt-1">
                  Start log ID:<br><code class="small">{{ info.record.start_id }}</code>
                </div>
                <div class="mt-1">
                  End log ID:<br><code class="small">{{ info.record.end_id }}</code>
                </div>
                <div class="text-muted mt-1">
                  Note: start/end IDs mark the boundary of this batch only. Continuity with other batches is not guaranteed on-chain.
                </div>
              </div>
            </li>

            <li class="list-group-item">
              <strong>Severity distribution:</strong>
              <div class="ml-3 mt-1 small">
                <div>Max severity: <span :class="severityClass(info.record.max_severity)" class="badge badge-pill">{{ info.record.max_severity }}</span></div>
                <div class="mt-1">Level distribution:
                  <span v-if="info.record.debug_count" class="badge badge-secondary mr-1">DEBUG {{ info.record.debug_count }}</span>
                  <span v-if="info.record.info_count" class="badge badge-info mr-1">INFO {{ info.record.info_count }}</span>
                  <span v-if="info.record.warn_count" class="badge badge-warning mr-1">WARN {{ info.record.warn_count }}</span>
                  <span v-if="info.record.error_count" class="badge badge-danger mr-1">ERROR {{ info.record.error_count }}</span>
                  <span v-if="info.record.critical_count" class="badge badge-dark mr-1">CRITICAL {{ info.record.critical_count }}</span>
                </div>
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

      <div v-if="info && info.verified" class="alert alert-success mt-3">
        <strong>Cryptographic proof verified.</strong> The batch Merkle root exists in the Exonum
        <code>batches</code> state tree and is signed by the validator set. This proves the
        batch of {{ info.record && info.record.count }} logs (IDs
        {{ info.record && info.record.start_id && info.record.start_id.slice(0, 8) }}…
        to {{ info.record && info.record.end_id && info.record.end_id.slice(0, 8) }}…)
        has not been tampered with.
      </div>
      <div v-else-if="info && !info.verified" class="alert alert-warning mt-3">
        Batch hash not found in the <code>batches</code> map.
        <router-link :to="{ name: 'dashboard' }">Try verifying on the Dashboard</router-link>.
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
        this.info = await this.$blockchain.verifyBatch(this.hash)
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
    severityClass (level) {
      const map = { DEBUG: 'badge-secondary', INFO: 'badge-info', WARN: 'badge-warning', ERROR: 'badge-danger', CRITICAL: 'badge-dark' }
      return map[level] || 'badge-secondary'
    }
  }
}
</script>

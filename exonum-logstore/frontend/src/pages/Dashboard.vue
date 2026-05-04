<template>
  <div>
    <navbar />
    <div class="container mt-4">

      <!-- ── Verify hash ─────────────────────────────────────────────────── -->
      <div class="card">
        <div class="card-header font-weight-bold">🔍 Verify Hash on Exonum</div>
        <div class="card-body">
          <form @submit.prevent="verify">
            <div class="form-group">
              <label>SHA-256 content hash (64 hex chars)</label>
              <input v-model="verifyHash" class="form-control font-monospace"
                     placeholder="0a1b2c…" minlength="64" maxlength="64" required>
            </div>
            <button class="btn btn-success" type="submit">Verify</button>
            <span class="text-muted small ml-3">Auto-detects full log or hash anchor</span>
          </form>
        </div>
      </div>

      <!-- verification result -->
      <div v-if="verifyResult" class="card mt-3">
        <div class="card-header d-flex align-items-center">
          Verification Result
          <span v-if="verifyResult.recordType === 'log'"
                class="badge badge-primary ml-2">Full Log (private_chain)</span>
          <span v-else-if="verifyResult.recordType === 'hash'"
                class="badge badge-secondary ml-2">Hash Anchor (hybrid)</span>
        </div>
        <ul class="list-group list-group-flush small">
          <li class="list-group-item">
            <strong>Status:</strong>
            <span v-if="verifyResult.verified" class="text-success font-weight-bold">
              ✅ Found &amp; Merkle proof valid
            </span>
            <span v-else class="text-danger font-weight-bold">
              ❌ Not anchored on chain
            </span>
          </li>

          <!-- Full log fields -->
          <template v-if="verifyResult.recordType === 'log' && verifyResult.record">
            <li class="list-group-item">
              <strong>Level:</strong> {{ verifyResult.record.level }}
              &nbsp;|&nbsp;
              <strong>Source:</strong> {{ verifyResult.record.source }}
            </li>
            <li class="list-group-item">
              <strong>Message:</strong> {{ verifyResult.record.message || verifyResult.record.message_preview }}
            </li>
          </template>

          <!-- Hash anchor fields -->
          <template v-if="verifyResult.recordType === 'hash' && verifyResult.record">
            <li class="list-group-item">
              <strong>Level:</strong> {{ verifyResult.record.level }}
            </li>
            <li class="list-group-item">
              <strong>Preview:</strong> {{ verifyResult.record.message_preview }}
              <span class="badge badge-warning ml-1">hash-only — full data in DB</span>
            </li>
          </template>

          <li v-if="verifyResult.commitBlockHeight != null" class="list-group-item">
            <strong>Committed in block:</strong>
            <router-link :to="{ name: 'block', params: { height: String(verifyResult.commitBlockHeight) } }">
              #{{ verifyResult.commitBlockHeight }}
            </router-link>
          </li>
          <li v-if="verifyResult.block" class="list-group-item">
            <strong>State proof from block:</strong>
            <router-link :to="{ name: 'block', params: { height: verifyResult.block.height } }">
              #{{ verifyResult.block.height }}
            </router-link>
            <span class="text-muted small ml-2">(latest block at query time)</span>
          </li>
          <li v-if="verifyResult.merkleRoot" class="list-group-item">
            <strong>Merkle root:</strong>
            <code class="small">{{ verifyResult.merkleRoot }}</code>
          </li>
          <li v-if="verifyResult.verified && verifyResult.recordType === 'log'" class="list-group-item">
            <router-link :to="{ name: 'log', params: { hash: verifyHash } }">
              View full proof →
            </router-link>
          </li>
          <li v-if="verifyResult.verified && verifyResult.recordType === 'hash'" class="list-group-item">
            <router-link :to="{ name: 'hash', params: { hash: verifyHash } }">
              View full proof →
            </router-link>
          </li>
        </ul>
      </div>

      <!-- recent blocks -->
      <div class="card mt-3">
        <div class="card-header">
          Recent Blocks
          <router-link class="float-right small" :to="{ name: 'blockchain' }">view all</router-link>
        </div>
        <ul class="list-group list-group-flush">
          <li v-for="b in recentBlocks" :key="b.height" class="list-group-item py-1 small">
            <router-link :to="{ name: 'block', params: { height: b.height } }">
              #{{ b.height }}
            </router-link>
            &nbsp;<span class="text-muted">{{ b.tx_count }} tx</span>
          </li>
          <li v-if="recentBlocks.length === 0" class="list-group-item text-muted small">
            Connecting…
          </li>
        </ul>
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
  data () {
    return {
      loading:      false,
      verifyHash:   '',
      verifyResult: null,
      recentBlocks: []
    }
  },
  mounted () {
    this.loadRecentBlocks()
  },
  methods: {
    async verify () {
      if (!this.$validateHex(this.verifyHash)) {
        return this.$notify('error', 'Invalid hash — must be 64 hex characters')
      }
      this.loading = true
      this.verifyResult = null
      try {
        this.verifyResult = await this.$blockchain.verifyAny(this.verifyHash)
        if (!this.verifyResult.verified) this.$notify('warning', 'Hash not found on chain')
        else this.$notify('success', 'Proof verified ✅')
      } catch (e) {
        this.$notify('error', e.toString())
      } finally {
        this.loading = false
      }
    },

    async loadRecentBlocks () {
      try {
        const data = await this.$blockchain.getBlocks()
        this.recentBlocks = (data.blocks || []).slice(0, 8)
        const ws = new WebSocket(`ws://${window.location.host}/api/explorer/v1/blocks/subscribe`)
        ws.onerror   = () => {}
        ws.onmessage = ev => {
          this.recentBlocks.unshift(JSON.parse(ev.data))
          if (this.recentBlocks.length > 8) this.recentBlocks.pop()
        }
      } catch {}
    }
  }
}
</script>

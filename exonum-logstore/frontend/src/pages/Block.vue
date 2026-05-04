<template>
  <div>
    <navbar />
    <div class="container mt-4">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><router-link :to="{ name: 'blockchain' }">Blockchain</router-link></li>
          <li class="breadcrumb-item active">Block #{{ height }}</li>
        </ol>
      </nav>

      <div class="card">
        <div class="card-header font-weight-bold">Block #{{ height }}</div>
        <ul class="list-group list-group-flush">
          <li class="list-group-item"><strong>Height:</strong> {{ block.height }}</li>
          <li class="list-group-item"><strong>Proposer ID:</strong> {{ block.proposer_id }}</li>
          <li class="list-group-item"><strong>Prev hash:</strong><br><code class="small">{{ block.prev_hash }}</code></li>
          <li class="list-group-item"><strong>State hash:</strong><br><code class="small">{{ block.state_hash }}</code></li>
          <li class="list-group-item"><strong>Tx count:</strong> {{ (transactions || []).length }}</li>
        </ul>
      </div>

      <div class="card mt-3">
        <div class="card-header font-weight-bold">Transactions</div>
        <ul class="list-group list-group-flush">
          <li v-for="tx in transactions" :key="tx.tx_hash" class="list-group-item">
            <router-link :to="{ name: 'transaction', params: { hash: tx.tx_hash } }">
              <code class="small">{{ tx.tx_hash }}</code>
            </router-link>
          </li>
          <li v-if="!transactions || transactions.length === 0" class="list-group-item text-muted">
            No transactions in this block.
          </li>
        </ul>
      </div>

      <nav class="mt-3">
        <ul class="pagination justify-content-center">
          <li class="page-item" :class="{ disabled: parseInt(height) <= 0 }">
            <router-link :to="{ name: 'block', params: { height: String(parseInt(height) - 1) } }" class="page-link">← Prev</router-link>
          </li>
          <li class="page-item">
            <router-link :to="{ name: 'block', params: { height: String(parseInt(height) + 1) } }" class="page-link">Next →</router-link>
          </li>
        </ul>
      </nav>
    </div>
    <spinner :visible="loading" />
  </div>
</template>

<script>
import Navbar from '../components/Navbar.vue'
import Spinner from '../components/Spinner.vue'

export default {
  components: { Navbar, Spinner },
  props: { height: { type: String, default: '0' } },
  data () { return { block: {}, transactions: [], loading: false } },
  watch: { height () { this.load() } },
  mounted () { this.load() },
  methods: {
    async load () {
      this.loading = true
      try {
        const data = await this.$blockchain.getBlock(this.height)
        this.block = data
        this.transactions = data.txs || []
      } catch (e) {
        this.$notify('error', e.toString())
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

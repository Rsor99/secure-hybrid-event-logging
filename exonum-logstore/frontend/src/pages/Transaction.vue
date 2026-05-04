<template>
  <div>
    <navbar />
    <div class="container mt-4">
      <nav v-if="location.block_height" aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><router-link :to="{ name: 'blockchain' }">Blockchain</router-link></li>
          <li class="breadcrumb-item">
            <router-link :to="{ name: 'block', params: { height: String(location.block_height) } }">
              Block #{{ location.block_height }}
            </router-link>
          </li>
          <li class="breadcrumb-item active">Tx</li>
        </ol>
      </nav>

      <div class="card">
        <div class="card-header font-weight-bold">Transaction</div>
        <ul class="list-group list-group-flush">
          <li class="list-group-item"><strong>Hash:</strong><br><code class="small">{{ hash }}</code></li>
          <li v-if="location.block_height" class="list-group-item">
            <strong>Block:</strong>
            <router-link :to="{ name: 'block', params: { height: String(location.block_height) } }">
              #{{ location.block_height }}
            </router-link>
          </li>
          <li class="list-group-item"><strong>Type:</strong> <code>{{ type }}</code></li>
          <li class="list-group-item"><strong>Status:</strong> <code>{{ status && status.type }}</code></li>
          <li v-if="content" class="list-group-item">
            <strong>Payload:</strong>
            <pre class="mt-1 small"><code>{{ JSON.stringify(content, null, 2) }}</code></pre>
          </li>
        </ul>
      </div>

      <!-- If this is a WriteLog tx, show a verify link -->
      <div v-if="content && content.content_hash" class="mt-3">
        <router-link :to="{ name: 'log', params: { hash: content.content_hash } }" class="btn btn-success btn-sm">
          🔍 View on-chain log proof
        </router-link>
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
  data () { return { content: null, location: {}, status: {}, type: '', loading: false } },
  mounted () { if (this.hash) this.load() },
  methods: {
    async load () {
      this.loading = true
      try {
        const data = await this.$blockchain.getTransaction(this.hash)
        this.location = data.location || {}
        this.status   = data.status   || {}
        this.type     = data.type     || ''
        // Try to parse WriteLog payload from message hex
        this.content  = data.content  || null
      } catch (e) {
        this.$notify('error', e.toString())
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

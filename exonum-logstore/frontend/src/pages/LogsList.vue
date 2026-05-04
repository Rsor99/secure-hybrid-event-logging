<template>
  <div>
    <navbar />
    <div class="container mt-4">
      <div class="card">
        <div class="card-header font-weight-bold">
          On-Chain Logs
          <span class="text-muted small ml-2">{{ total }} total</span>
        </div>
        <ul class="list-group list-group-flush">
          <li class="list-group-item font-weight-bold small">
            <div class="row">
              <div class="col-3">Hash</div>
              <div class="col-1">Level</div>
              <div class="col-2">Source</div>
              <div class="col-6">Message</div>
            </div>
          </li>
          <li v-for="r in items" :key="r.content_hash" class="list-group-item small py-2">
            <div class="row align-items-center">
              <div class="col-3 text-truncate">
                <router-link :to="{ name: 'log', params: { hash: r.content_hash } }"
                             class="font-monospace small">
                  {{ r.content_hash.slice(0, 16) }}…
                </router-link>
              </div>
              <div class="col-1">
                <span :class="levelClass(r.level)" class="badge badge-pill">{{ r.level }}</span>
              </div>
              <div class="col-2 text-truncate text-muted">{{ r.source }}</div>
              <div class="col-6 text-truncate">{{ (r.message || r.message_preview || '').slice(0, 100) }}</div>
            </div>
          </li>
          <li v-if="!loading && items.length === 0" class="list-group-item text-muted small">
            No logs on chain yet.
          </li>
        </ul>
        <div class="card-body d-flex justify-content-between align-items-center">
          <button class="btn btn-outline-secondary btn-sm" :disabled="offset === 0" @click="prev">← Newer</button>
          <span class="text-muted small">{{ offset + 1 }}–{{ Math.min(offset + limit, total) }} of {{ total }}</span>
          <button class="btn btn-outline-secondary btn-sm" :disabled="offset + limit >= total" @click="next">Older →</button>
        </div>
      </div>
    </div>
    <spinner :visible="loading" />
  </div>
</template>

<script>
import Navbar  from '../components/Navbar.vue'
import Spinner from '../components/Spinner.vue'

const LIMIT = 20

export default {
  components: { Navbar, Spinner },
  data () { return { items: [], total: 0, offset: 0, limit: LIMIT, loading: false } },
  mounted () { this.load() },
  methods: {
    async load () {
      this.loading = true
      try {
        const data = await this.$blockchain.getLogs(this.offset, this.limit)
        this.items = data.items || []
        this.total = data.total || 0
      } catch (e) {
        this.$notify('error', e.toString())
      } finally {
        this.loading = false
      }
    },
    prev () { this.offset = Math.max(0, this.offset - this.limit); this.load() },
    next () { this.offset += this.limit; this.load() },
    levelClass (level) {
      const map = { DEBUG: 'badge-secondary', INFO: 'badge-info', WARN: 'badge-warning', ERROR: 'badge-danger', CRITICAL: 'badge-dark' }
      return map[level] || 'badge-secondary'
    }
  }
}
</script>

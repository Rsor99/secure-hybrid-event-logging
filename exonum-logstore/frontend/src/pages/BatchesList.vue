<template>
  <div>
    <navbar />
    <div class="container mt-4">
      <div class="card">
        <div class="card-header font-weight-bold">
          Batch Anchors
          <span class="text-muted small ml-2">{{ total }} total</span>
        </div>
        <ul class="list-group list-group-flush">
          <li class="list-group-item font-weight-bold small">
            <div class="row">
              <div class="col-4">Batch Merkle Root</div>
              <div class="col-2">Max Severity</div>
              <div class="col-2">Count</div>
              <div class="col-2">Start ID</div>
              <div class="col-2">End ID</div>
            </div>
          </li>
          <li v-for="r in items" :key="r.content_hash" class="list-group-item small py-2">
            <div class="row align-items-center">
              <div class="col-4 text-truncate">
                <router-link :to="{ name: 'batch', params: { hash: r.content_hash } }"
                             class="font-monospace small">
                  {{ r.content_hash.slice(0, 24) }}…
                </router-link>
              </div>
              <div class="col-2">
                <span :class="levelClass(r.max_severity)" class="badge badge-pill">{{ r.max_severity }}</span>
              </div>
              <div class="col-2 text-muted">{{ r.count }} logs</div>
              <div class="col-2 text-truncate font-monospace small text-muted">{{ (r.start_id || '').slice(0, 8) }}…</div>
              <div class="col-2 text-truncate font-monospace small text-muted">{{ (r.end_id || '').slice(0, 8) }}…</div>
            </div>
          </li>
          <li v-if="!loading && items.length === 0" class="list-group-item text-muted small">
            No batch anchors on chain yet.
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
        const data = await this.$blockchain.getBatches(this.offset, this.limit)
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

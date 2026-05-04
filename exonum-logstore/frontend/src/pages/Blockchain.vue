<template>
  <div>
    <navbar />
    <div class="container mt-4">
      <div class="card">
        <div class="card-header font-weight-bold">Blockchain — Block List</div>
        <ul class="list-group list-group-flush">
          <li class="list-group-item font-weight-bold">
            <div class="row"><div class="col-4">Height</div><div class="col-4">Tx count</div><div class="col-4">Proposer</div></div>
          </li>
          <li v-for="b in blocks" :key="b.height" class="list-group-item">
            <div class="row">
              <div class="col-4">
                <router-link :to="{ name: 'block', params: { height: b.height } }">{{ b.height }}</router-link>
              </div>
              <div class="col-4">{{ b.tx_count }}</div>
              <div class="col-4 text-muted small">{{ b.proposer_id }}</div>
            </div>
          </li>
        </ul>
        <div class="card-body text-center">
          <a href="#" class="btn btn-outline-secondary btn-sm" @click.prevent="loadMore">Load older blocks</a>
        </div>
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
  data () { return { blocks: [], loading: false, ws: null } },
  mounted () { this.loadBlocks() },
  beforeDestroy () { if (this.ws) this.ws.close() },
  methods: {
    async loadBlocks (latest) {
      if (this.ws) this.ws.close()
      this.loading = true
      try {
        const data = await this.$blockchain.getBlocks(latest)
        this.blocks = latest ? this.blocks.concat(data.blocks) : data.blocks
        this.ws = new WebSocket(`ws://${window.location.host}/api/explorer/v1/blocks/subscribe`)
        this.ws.onerror = () => {}
        this.ws.onclose = () => {}
        this.ws.onmessage = ev => this.blocks.unshift(JSON.parse(ev.data))
      } catch (e) {
        this.$notify('error', e.toString())
      } finally {
        this.loading = false
      }
    },
    loadMore () {
      if (!this.blocks.length) return
      const oldest = this.blocks[this.blocks.length - 1]
      this.loadBlocks(oldest.height - 1)
    }
  }
}
</script>

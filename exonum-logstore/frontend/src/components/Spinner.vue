<template>
  <div v-if="visible" class="spinner-overlay d-flex align-items-center justify-content-center">
    <div class="spinner-border text-light" role="status">
      <span class="sr-only">Loading…</span>
    </div>
  </div>
</template>

<script>
export default {
  props: { visible: { type: Boolean, default: false } }
}
</script>

<style scoped>
.spinner-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.4); z-index: 9999;
}
</style>

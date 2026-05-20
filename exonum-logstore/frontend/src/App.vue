<template>
  <div id="app-root">
    <router-view />
    <footer class="pb-4 mt-5">
      <hr>
      <div class="container text-center text-muted small">
        Exonum — hybrid DB blockchain log anchoring experiment
      </div>
    </footer>
  </div>
</template>

<style>
html, body { background: #0f1117; color: #e2e8f0; margin: 0; padding: 0; }
#app-root { min-height: 100vh; background: #0f1117; }
.container { max-width: 100% !important; padding-left: 32px !important; padding-right: 32px !important; }
</style>

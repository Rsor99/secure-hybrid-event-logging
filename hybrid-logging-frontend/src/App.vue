<template>
  <div class="app">
    <nav class="nav">
      <div class="nav-brand">🔗 Hybrid Logging</div>
      <div class="nav-links">
        <router-link to="/send" class="nav-link">Send Log</router-link>
        <router-link to="/logs" class="nav-link">Logs</router-link>
        <router-link to="/verify" class="nav-link">Verify</router-link>
        <span class="health-dot" :class="healthStatus" :title="healthLabel" />
      </div>
    </nav>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const healthStatus = ref('unknown')
const healthLabel = ref('Checking...')

onMounted(async () => {
  try {
    const r = await axios.get('/health')
    healthStatus.value = 'ok'
    healthLabel.value = `DB: ${r.data.db}`
  } catch {
    healthStatus.value = 'error'
    healthLabel.value = 'Backend offline'
  }
})
</script>

<style>
.app { display: flex; flex-direction: column; min-height: 100vh; }
.nav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px; height: 52px;
  background: #161b22; border-bottom: 1px solid #30363d;
}
.nav-brand { font-weight: 700; font-size: 15px; color: #58a6ff; }
.nav-links { display: flex; align-items: center; gap: 20px; }
.nav-link {
  color: #8b949e; text-decoration: none; font-size: 14px;
  padding: 4px 8px; border-radius: 6px; transition: color .15s, background .15s;
}
.nav-link:hover, .nav-link.router-link-active { color: #e2e8f0; background: #21262d; }
.health-dot {
  width: 8px; height: 8px; border-radius: 50%; cursor: help;
}
.health-dot.ok      { background: #3fb950; box-shadow: 0 0 6px #3fb950; }
.health-dot.error   { background: #f85149; box-shadow: 0 0 6px #f85149; }
.health-dot.unknown { background: #8b949e; }
.main { flex: 1; padding: 32px 24px; max-width: 880px; margin: 0 auto; width: 100%; }

/* shared utilities */
.card { background: #161b22; border: 1px solid #30363d; border-radius: 10px; padding: 24px; }
.section-title { font-size: 13px; font-weight: 600; color: #8b949e; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 12px; }
.label { display: block; font-size: 13px; color: #8b949e; margin-bottom: 6px; }
.input, .select, .textarea {
  width: 100%; padding: 8px 12px; background: #0d1117; border: 1px solid #30363d;
  border-radius: 6px; color: #e2e8f0; font-size: 14px; outline: none;
  transition: border-color .15s;
}
.input:focus, .select:focus, .textarea:focus { border-color: #58a6ff; }
.select option { background: #0d1117; }
.textarea { resize: vertical; min-height: 80px; font-family: inherit; }
.btn {
  padding: 8px 18px; border-radius: 6px; border: none; cursor: pointer;
  font-size: 14px; font-weight: 600; transition: opacity .15s, transform .1s;
}
.btn:active { transform: scale(.97); }
.btn:disabled { opacity: .45; cursor: not-allowed; }
.btn-primary { background: #238636; color: #fff; }
.btn-primary:hover:not(:disabled) { background: #2ea043; }
.btn-danger  { background: #b91c1c; color: #fff; }
.btn-ghost   { background: #21262d; color: #e2e8f0; }
.btn-ghost:hover:not(:disabled) { background: #30363d; }
.tag {
  display: inline-block; padding: 2px 8px; border-radius: 12px;
  font-size: 12px; font-weight: 600;
}
.tag-debug    { background: #1f2937; color: #9ca3af; }
.tag-info     { background: #0c2a4a; color: #58a6ff; }
.tag-warn     { background: #2d1e00; color: #e3b341; }
.tag-error    { background: #3d0c0c; color: #f85149; }
.tag-critical { background: #2d0030; color: #d2a8ff; }
.mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; }
</style>

<template>
  <nav class="navbar navbar-dark bg-dark">
    <router-link class="navbar-brand" :to="{ name: 'dashboard' }">
      Exonum Explorer
      <span class="nav-badge">Exonum Private Chain</span>
    </router-link>
    <div class="navbar-nav">
      <router-link class="nav-link" :to="{ name: 'dashboard' }">Dashboard</router-link>
      <router-link class="nav-link" :to="{ name: 'logs-list' }">Logs</router-link>
      <router-link class="nav-link" :to="{ name: 'hashes-list' }">Hashes</router-link>
      <router-link class="nav-link" :to="{ name: 'batches-list' }">Batches</router-link>
      <router-link class="nav-link" :to="{ name: 'blockchain' }">Blockchain</router-link>
    </div>
  </nav>
</template>

<style scoped>
.navbar { display: flex; align-items: center; gap: 12px; justify-content: space-between; }
.navbar-brand { display: flex; align-items: center; gap: 10px; margin-right: 24px; }
.nav-badge {
  font-size: 11px;
  background: #1a2d4a;
  color: #60a5fa;
  padding: 3px 8px;
  border-radius: 99px;
  font-weight: 400;
}
.navbar-nav { display: flex; flex-direction: row; gap: 2px; margin-left: auto; }
</style>

<template>
  <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
    <router-link class="navbar-brand" :to="{ name: 'dashboard' }">⛓ LogStore</router-link>
    <div class="navbar-nav ml-auto">
      <router-link class="nav-link" :to="{ name: 'dashboard' }">Dashboard</router-link>
      <router-link class="nav-link" :to="{ name: 'logs-list' }">Logs</router-link>
      <router-link class="nav-link" :to="{ name: 'hashes-list' }">Hashes</router-link>
      <router-link class="nav-link" :to="{ name: 'batches-list' }">Batches</router-link>
      <router-link class="nav-link" :to="{ name: 'blockchain' }">Blockchain</router-link>
    </div>
  </nav>
</template>

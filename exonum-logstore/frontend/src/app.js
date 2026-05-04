import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import NotifyPlugin from './plugins/notify'
import ValidatePlugin from './plugins/validate'
import BlockchainPlugin from './plugins/blockchain'

Vue.use(NotifyPlugin)
Vue.use(ValidatePlugin)
Vue.use(BlockchainPlugin)

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')

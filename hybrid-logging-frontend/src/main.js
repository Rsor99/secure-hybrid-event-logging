import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import SendLog  from './views/SendLog.vue'
import VerifyLog from './views/VerifyLog.vue'
import LogsList from './views/LogsList.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/send' },
    { path: '/send',   component: SendLog },
    { path: '/verify', component: VerifyLog },
    { path: '/logs',   component: LogsList },
  ]
})

createApp(App).use(router).mount('#app')

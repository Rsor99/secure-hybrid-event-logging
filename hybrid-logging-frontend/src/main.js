import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import SendLog    from './views/SendLog.vue'
import VerifyLog  from './views/VerifyLog.vue'
import LogsList   from './views/LogsList.vue'
import AnchoredLogs from './views/AnchoredLogs.vue'
import BatchedLogs  from './views/BatchedLogs.vue'
import Batches      from './views/Batches.vue'
import ExperimentSuite from './views/ExperimentSuite.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/',          redirect: '/send' },
    { path: '/send',      component: SendLog },
    { path: '/verify',    component: VerifyLog },
    { path: '/logs',      component: LogsList },
    { path: '/anchored',  component: AnchoredLogs },
    { path: '/batched',   component: BatchedLogs },
    { path: '/batches',   component: Batches },
    { path: '/experiments', component: ExperimentSuite },
  ]
})

createApp(App).use(router).mount('#app')

import Vue from 'vue'
import Router from 'vue-router'
import Dashboard   from '../pages/Dashboard.vue'
import LogDetail   from '../pages/LogDetail.vue'
import HashDetail  from '../pages/HashDetail.vue'
import BatchDetail from '../pages/BatchDetail.vue'
import LogsList    from '../pages/LogsList.vue'
import HashesList  from '../pages/HashesList.vue'
import BatchesList from '../pages/BatchesList.vue'
import Blockchain  from '../pages/Blockchain.vue'
import Block       from '../pages/Block.vue'
import Transaction from '../pages/Transaction.vue'

Vue.use(Router)

export default new Router({
  routes: [
    { path: '/',                    name: 'dashboard',    component: Dashboard },
    { path: '/log/:hash',           name: 'log',          component: LogDetail,    props: true },
    { path: '/hash/:hash',          name: 'hash',         component: HashDetail,   props: true },
    { path: '/batch/:hash',         name: 'batch',        component: BatchDetail,  props: true },
    { path: '/logs-list',           name: 'logs-list',    component: LogsList },
    { path: '/hashes-list',         name: 'hashes-list',  component: HashesList },
    { path: '/batches-list',        name: 'batches-list', component: BatchesList },
    { path: '/blockchain',          name: 'blockchain',   component: Blockchain },
    { path: '/block/:height',       name: 'block',        component: Block,        props: true },
    { path: '/transaction/:hash',   name: 'transaction',  component: Transaction,  props: true }
  ]
})

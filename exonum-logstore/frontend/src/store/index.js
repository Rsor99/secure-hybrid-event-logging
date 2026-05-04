import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

const KEY = 'logstore-keypair'

export default new Vuex.Store({
  state: {
    keyPair: JSON.parse(localStorage.getItem(KEY) || 'null')
  },
  mutations: {
    setKeyPair (state, keyPair) {
      localStorage.setItem(KEY, JSON.stringify(keyPair))
      state.keyPair = keyPair
    },
    clearKeyPair (state) {
      localStorage.removeItem(KEY)
      state.keyPair = null
    }
  }
})

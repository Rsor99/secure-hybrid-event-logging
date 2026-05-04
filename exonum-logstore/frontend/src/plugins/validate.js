export default {
  install (Vue) {
    Vue.prototype.$validateHex = function (hash, bytes = 32) {
      if (typeof hash !== 'string') return false
      if (hash.length !== bytes * 2) return false
      return /^[0-9a-f]+$/i.test(hash)
    }
  }
}

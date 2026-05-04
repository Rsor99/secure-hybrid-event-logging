import Noty from 'noty'

export default {
  install (Vue) {
    Vue.prototype.$notify = function (type = 'info', text) {
      new Noty({ theme: 'bootstrap-v4', timeout: 5000, type, text, killer: true }).show()
    }
  }
}

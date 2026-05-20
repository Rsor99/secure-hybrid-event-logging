import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/log':        'http://localhost:3000',
      '/logs':       'http://localhost:3000',
      '/verify':     'http://localhost:3000',
      '/verify-batch': 'http://localhost:3000',
      '/health':     'http://localhost:3000',
      '/experiment': 'http://localhost:3000',
      '/chain':      'http://localhost:3000',
    }
  }
})

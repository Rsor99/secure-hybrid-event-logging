const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware')
const argv = require('yargs-parser')(process.argv.slice(2))

const port    = argv.port    || 8080
const apiRoot = argv['api-root'] || 'http://127.0.0.1:8200'
const nodeApi = argv['node-api'] || 'http://127.0.0.1:3000'

const app = express()

// Serve compiled frontend
app.use(express.static(__dirname + '/'))

// Proxy /api/* → Exonum node
app.use('/api', createProxyMiddleware({
  target: apiRoot,
  ws: true,
  headers: { Origin: 'http://localhost' },
  changeOrigin: true
}))

// Proxy /node-api/* → logging-benchmark Node.js API
app.use('/node-api', createProxyMiddleware({
  target: nodeApi,
  changeOrigin: true,
  pathRewrite: { '^/node-api': '' }
}))

app.listen(port, () => {
  console.log(`LogStore frontend listening on http://localhost:${port}`)
  console.log(`  Exonum node  : ${apiRoot}`)
  console.log(`  Node.js API  : ${nodeApi}`)
})

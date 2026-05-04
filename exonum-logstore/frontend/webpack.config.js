const path = require('path')
const { VueLoaderPlugin } = require('vue-loader')
const webpack = require('webpack')

module.exports = {
  mode: 'development',
  entry: './src/app.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'build.js'
  },
  module: {
    rules: [
      { test: /\.js$/,  use: 'babel-loader' },
      { test: /\.vue$/, use: 'vue-loader' },
      { test: /\.css$/, use: ['vue-style-loader', 'css-loader'] },
      { test: /\.(ttf|eot|svg|gif|woff2?)(\?.*)?$/, use: 'file-loader' }
    ]
  },
  plugins: [
    new VueLoaderPlugin(),
    // Provide Buffer global — needed by exonum-client under webpack 5
    new webpack.ProvidePlugin({ Buffer: ['buffer', 'Buffer'] })
  ],
  resolve: {
    alias: { vue$: 'vue/dist/vue.esm.js' },
    fallback: {
      buffer: require.resolve('buffer/'),
      crypto: false,
      stream: false,
      path:   false,
      fs:     false
    }
  }
}

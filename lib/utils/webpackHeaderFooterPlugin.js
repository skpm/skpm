const { ConcatSource } = require('webpack-sources')

/* eslint-disable no-not-accumulator-reassign/no-not-accumulator-reassign */
module.exports = function WebpackFooterPlugin(header, footer) {
  return {
    apply(compiler) {
      compiler.plugin('compilation', compilation => {
        compilation.plugin('optimize-chunk-assets', (chunks, callback) => {
          chunks.forEach(chunk => {
            if (!chunk.isInitial()) return
            chunk.files.forEach(file => {
              compilation.assets[file] = new ConcatSource(
                header,
                '\n',
                compilation.assets[file],
                '\n',
                footer
              )
            })
          })
          callback()
        })
      })
    },
  }
}

const ConcatSource = require('webpack-sources').ConcatSource

module.exports = function WebpackFooterPlugin (header, footer) {
  return {
    apply: function (compiler) {
      compiler.plugin('compilation', (compilation) => {
        compilation.plugin('optimize-chunk-assets', (chunks, callback) => {
          chunks.forEach((chunk) => {
            if (!chunk.isInitial()) return
            chunk.files.forEach((file) => {
              compilation.assets[file] = new ConcatSource(header, '\n', compilation.assets[file], '\n', footer)
            })
          })
          callback()
        })
      })
    }
  }
}

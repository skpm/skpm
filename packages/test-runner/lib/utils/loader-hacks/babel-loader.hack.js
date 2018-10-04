/* eslint-disable no-not-accumulator-reassign/no-not-accumulator-reassign */

module.exports = function hackBabelConfig(skpmConfig, loader) {
  if (!loader.options) {
    loader.options = {}
  }
  loader.options.plugins = [
    [require('./globals-babel-plugin'), skpmConfig.test],
  ].concat(loader.options.plugins || [])
}

/* eslint-disable no-not-accumulator-reassign/no-not-accumulator-reassign */

module.exports = function hackTypescriptConfig(skpmConfig, loader) {
  if (!loader.options) {
    loader.options = {}
  }
  if (!loader.options.babelOptions) {
    loader.options.babelOptions = {
      babelrc: false,
    }
  }
  loader.options.useBabel = true
  loader.options.babelOptions.plugins = (
    loader.options.babelOptions.plugins || []
  ).concat([[require('./globals-babel-plugin'), skpmConfig.test]])
}

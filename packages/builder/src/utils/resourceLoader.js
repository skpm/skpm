import path from 'path'

const fileRegex = /^(?!.*\.(jsx?|tsx?|json|nib|xib)$).*/ // match everything except .jsx? and .tsx? and json

const WEBPACK_DIRECTORY = '_webpack_resources'

const commandResourceLoader = {
  test: fileRegex,
  use: {
    loader: '@skpm/file-loader',
    query: {
      raw: true,
      outputPath(url) {
        return path.posix.join('..', 'Resources', WEBPACK_DIRECTORY, url)
      },
      publicPath(url) {
        return `"file://" + context.plugin.urlForResourceNamed("${WEBPACK_DIRECTORY}/${url}").path()`
      },
    },
  },
}

export default commandResourceLoader

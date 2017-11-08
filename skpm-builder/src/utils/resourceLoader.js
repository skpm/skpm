import path from 'path'

const fileRegex = /^(?!.*\.(jsx?|tsx?)$).*/ // match everything except .jsx? and .tsx?

const commandResourceLoader = {
  test: fileRegex,
  use: {
    loader: '@skpm/file-loader',
    query: {
      raw: true,
      outputPath(url) {
        return path.join('..', 'Resources', '_webpack_resources', url)
      },
      publicPath(url) {
        return `"file://" + context.plugin.urlForResourceNamed("${url.split(
          '../Resources/'
        )[1]}").path()`
      },
    },
  },
}

export default commandResourceLoader

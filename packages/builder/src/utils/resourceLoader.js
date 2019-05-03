import path from 'path'

const fileRegex = /^(?!.*\.(jsx?|tsx?|json|nib|xib)$).*/ // match everything except .jsx?, .tsx?, json, xib and nib

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
        return `"file://" + String(context.scriptPath).split(".sketchplugin/Contents/Sketch")[0] + ".sketchplugin/Contents/Resources/${WEBPACK_DIRECTORY}/${url}"`
      },
    },
  },
}

export default commandResourceLoader

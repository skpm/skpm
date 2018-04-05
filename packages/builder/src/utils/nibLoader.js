import path from 'path'

const nibRegex = /\.(nib|xib)?$/ // match xib or nib

const WEBPACK_DIRECTORY = '_webpack_resources'

const nibLoader = {
  test: nibRegex,
  use: {
    loader: '@skpm/nib-loader',
    query: {
      raw: true,
      outputPath(url) {
        return path.posix.join('..', 'Resources', WEBPACK_DIRECTORY, url)
      },
      publicPath(url) {
        return `${WEBPACK_DIRECTORY}/${url}`
      },
    },
  },
}

export default nibLoader

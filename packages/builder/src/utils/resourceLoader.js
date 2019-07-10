import path from 'path'

const WEBPACK_DIRECTORY = '_webpack_resources'

const resourceRegex = /^(?!.*\.(jsx?|tsx?|json|nib|xib|framework|xcodeproj|xcworkspace|xcworkspacedata|pbxproj)$).*/ // match everything except .jsx?, .tsx?, json, xib and nib

export const commandResourceLoader = {
  test: resourceRegex,
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

const nibRegex = /\.(nib|xib)?$/ // match xib or nib

export const nibLoader = {
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

const xcodeprojRegex = /\.(framework|xcodeproj|xcworkspace|xcworkspacedata|pbxproj)?$/ // match xcodeproj

export const xcodeprojLoader = {
  test: xcodeprojRegex,
  use: {
    loader: '@skpm/xcodeproj-loader',
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

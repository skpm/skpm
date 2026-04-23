import path from 'path'

const WEBPACK_DIRECTORY = '_webpack_resources'

const resourceRegex = /^(?!.*\.(jsx?|tsx?|json|nib|xib|framework|xcodeproj|xcworkspace|xcworkspacedata|pbxproj)$).*/ // match everything except .jsx?, .tsx?, json, xib and nib

export default {
  test: resourceRegex,
  use: {
    loader: '@skpm/file-loader',
    options: {
      esModule: false,
      raw: true,
      outputPath: url =>
        path.posix.join('..', 'Resources', WEBPACK_DIRECTORY, url),
      publicPath: url =>
        `"file://" + String(context.scriptPath).split(".sketchplugin/Contents/Sketch")[0] + ".sketchplugin/Contents/Resources/${WEBPACK_DIRECTORY}/${url}"`,
    },
  },
}

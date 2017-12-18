/* eslint-disable no-not-accumulator-reassign/no-not-accumulator-reassign */
import path from 'path'
import webpack from 'webpack'
import WebpackShellPlugin, {
  sketchtoolRunCommand,
} from '@skpm/builder/lib/utils/webpackCommandPlugin/webpackShellPlugin'
import { CLEAR } from './constants'

export default (skpmConfig, testFiles, argv) => config => {
  config.output.filename = 'compiled-tests.js'
  config.output.path = path.resolve(
    __dirname,
    '../../test-runner.sketchplugin/Contents/Sketch'
  )
  // https://webpack.js.org/configuration/output/#output-devtoolmodulefilenametemplate
  config.output.devtoolModuleFilenameTemplate = '[absolute-resource-path]'

  config.plugins.push(
    new webpack.ProvidePlugin({
      expect: [require.resolve('./expect'), 'default'],
    })
  )

  config.plugins.push(
    new WebpackShellPlugin({
      script: sketchtoolRunCommand(
        path.resolve(__dirname, '../../test-runner.sketchplugin'),
        'plugin-tests',
        {
          app: argv.app,
          withoutActivating: true,
          handleError: false,
          pre:
            argv.watch && require('./is-interactive')
              ? `printf "${CLEAR}" &&`
              : '',
          post: `| node "${path.join(
            __dirname,
            './report-test-results.js'
          )}" --testFiles=${testFiles.length}${argv.watch ? ' --watch' : ''}`,
        }
      ),
    })
  )

  const babelIndex = config.module.rules.findIndex(
    r => r.use.loader === 'babel-loader'
  )

  if (typeof babelIndex !== 'undefined') {
    config.module.rules[babelIndex].use.options.plugins = (config.module
      .rules[0].use.options.plugins || []
    ).concat([[require('./globals-babel-plugin'), skpmConfig.test]])
    config.module.rules[
      babelIndex
    ].exclude = /node_modules\/(?!(@skpm\/test-runner)\/).*/
  } else {
    throw new Error(
      'Not sure how to handle your loader. Please open an issue on https://github.com/skpm/skpm'
    )
  }

  config.devtool = 'source-map'

  return config
}

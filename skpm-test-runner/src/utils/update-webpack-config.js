/* eslint-disable no-not-accumulator-reassign/no-not-accumulator-reassign */
import path from 'path'
import webpack from 'webpack'
import WebpackShellPlugin, {
  sketchtoolRunCommand,
} from '@skpm/builder/lib/utils/webpackCommandPlugin/webpackShellPlugin'

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
        true,
        `| node "${path.join(
          __dirname,
          './report-test-results.js'
        )}" --testFiles=${testFiles.length}${argv.watch ? ' --watch' : ''}`
      ),
    })
  )

  config.module.rules[0].use.options.plugins = (config.module.rules[0].use
    .options.plugins || []
  ).concat([[require('./globals-babel-plugin'), skpmConfig.test]])

  config.devtool = 'source-map'

  return config
}

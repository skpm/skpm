/* eslint-disable no-not-accumulator-reassign/no-not-accumulator-reassign */
import path from 'path'
import webpack from 'webpack'
import WebpackShellPlugin, {
  sketchtoolRunCommand,
} from '@skpm/builder/lib/utils/webpackCommandPlugin/webpackShellPlugin'
import { CLEAR } from './constants'
import findLoader from './loader-hacks/find-loader'

const SUPPORTED_LOADERS = ['babel-loader', 'awesome-typescript-loader']

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

  if (!argv.buildOnly) {
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
  }

  let hacked = false

  for (let i = 0; i < SUPPORTED_LOADERS.length; i += 1) {
    const loader = findLoader(config, SUPPORTED_LOADERS[i])

    if (loader) {
      require(`./loader-hacks/${SUPPORTED_LOADERS[i]}.hack`)(skpmConfig, loader)
      hacked = true
      break
    }
  }

  if (!hacked) {
    throw new Error(
      'Not sure how to handle your loader. Please open an issue on https://github.com/skpm/skpm'
    )
  }

  config.devtool = 'source-map'

  return config
}

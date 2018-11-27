/* eslint-disable no-not-accumulator-reassign/no-not-accumulator-reassign */
const path = require('path')
const webpack = require('webpack')
const chalk = require('chalk')
const {
  sketchtoolRunCommand,
} = require('@skpm/builder/lib/utils/webpackCommandPlugin/webpackShellPlugin')
const { CLEAR } = require('./constants')
const findLoader = require('./loader-hacks/find-loader')
const WebpackTestRunner = require('./webpack-test-runner')

const SUPPORTED_LOADERS = ['babel-loader', 'awesome-typescript-loader']

function logCompilation(config, logProgress) {
  let resolveBuildingLog = null
  function storePromiseResolve() {
    if (resolveBuildingLog) {
      resolveBuildingLog()
    }
    return new Promise(resolve => {
      resolveBuildingLog = resolve
    })
  }

  config.plugins.push({
    apply(compiler) {
      compiler.hooks.beforeCompile.tapPromise('start log building', () => {
        logProgress(storePromiseResolve(), 'Compiling the test plugin')
        return Promise.resolve()
      })
    },
  })

  config.plugins.push({
    apply(compiler) {
      compiler.hooks.afterCompile.tapPromise('finish log building', () => {
        if (resolveBuildingLog) {
          resolveBuildingLog()
        }
        return Promise.resolve()
      })
    },
  })
}

module.exports = (skpmConfig, getTestFiles, argv, logProgress) => config => {
  config.output.filename = 'compiled-tests.js'
  config.output.path = path.resolve(
    __dirname,
    '../../test-runner.sketchplugin/Contents/Sketch'
  )
  // https://webpack.js.org/configuration/output/#output-devtoolmodulefilenametemplate
  config.output.devtoolModuleFilenameTemplate = '[absolute-resource-path]'

  config.plugins.push(
    new webpack.ProvidePlugin({
      expect: require.resolve('../../expect'),
    })
  )

  if (!argv.buildOnly) {
    config.plugins.push(
      // eslint-disable-next-line
      new WebpackTestRunner({
        script: sketchtoolRunCommand(
          path.resolve(__dirname, '../../test-runner.sketchplugin'),
          'plugin-tests',
          {
            app: argv.app,
            withoutActivating: true,
            handleError: false,
          }
        ),
        watching: argv.watch,
        getTestFiles,
        logProgress,
      })
    )
  }

  config.plugins.push({
    apply(compiler) {
      compiler.hooks.watchRun.tapPromise('Clean up screen', () => {
        process.stdout.write(CLEAR)
        getTestFiles().forEach(f =>
          console.log(`${chalk.bgYellow.white(' RUNS ')} ${chalk.dim(f.name)}`)
        )
        console.log('')
        return Promise.resolve()
      })
    },
  })

  logCompilation(config, logProgress)

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

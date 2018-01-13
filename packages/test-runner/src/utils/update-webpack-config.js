/* eslint-disable no-not-accumulator-reassign/no-not-accumulator-reassign */
import path from 'path'
import webpack from 'webpack'
import WebpackShellPlugin, {
  sketchtoolRunCommand,
} from '@skpm/builder/lib/utils/webpackCommandPlugin/webpackShellPlugin'
import { CLEAR } from './constants'

// that's pretty ugly. not sure if there is a better solution
function findLoader(config, loader) {
  for (let i = 0; i < (config.module.rules || []).length; i += 1) {
    const r = config.module.rules[i]
    if (r) {
      if (r.loader) {
        if (r.loader === loader) {
          // if we have a top level loader, move it inside use
          r.use = {
            loader: r.loader,
          }
          delete r.loader
          r.exclude = /node_modules\/(?!(@skpm\/test-runner)\/).*/
          return r.use
        }
      } else if (r.use) {
        if (Array.isArray(r.use)) {
          const useIndex = r.use.findIndex(u => u.loader === loader)
          if (useIndex !== -1) {
            r.exclude = /node_modules\/(?!(@skpm\/test-runner)\/).*/
            return r.use[useIndex]
          }
        } else if (r.use.loader === loader) {
          r.exclude = /node_modules\/(?!(@skpm\/test-runner)\/).*/
          return r.use
        }
      }
    }
  }
  return undefined
}

function hackBabelConfig(skpmConfig, loader) {
  if (!loader.options) {
    loader.options = {}
  }
  loader.options.plugins = (loader.options.plugins || []).concat([
    [require('./globals-babel-plugin'), skpmConfig.test],
  ])
}

function hackTypescriptConfig(skpmConfig, loader) {
  if (!loader.options) {
    loader.options = {}
  }
  if (!loader.options.babelOptions) {
    loader.options.babelOptions = {
      babelrc: false,
    }
  }
  loader.options.useBabel = true
  loader.options.babelOptions.plugins = (loader.options.babelOptions.plugins ||
    []
  ).concat([[require('./globals-babel-plugin'), skpmConfig.test]])
}

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

  const babelLoader = findLoader(config, 'babel-loader')

  if (babelLoader) {
    hackBabelConfig(skpmConfig, babelLoader)
  } else {
    const typescriptLoader = findLoader(config, 'awesome-typescript-loader')

    if (typescriptLoader) {
      hackTypescriptConfig(skpmConfig, typescriptLoader)
    } else {
      throw new Error(
        'Not sure how to handle your loader. Please open an issue on https://github.com/skpm/skpm'
      )
    }
  }

  config.devtool = 'source-map'

  return config
}

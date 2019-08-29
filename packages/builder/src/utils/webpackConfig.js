import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import webpack from 'webpack'
import merge from 'webpack-merge'
import TerserPlugin from 'terser-webpack-plugin'
import WebpackCommandPlugin from './webpackCommandPlugin'
import WebpackHeaderFooterPlugin from './webpackHeaderFooterPlugin'
import BabelLoader from './babelLoader'
import {
  commandResourceLoader,
  nibLoader,
  xcodeprojLoader,
} from './resourceLoader'

const CORE_MODULES = [
  'buffer',
  'console',
  'events',
  'os',
  'path',
  'process',
  'querystring',
  'stream',
  'string_decoder',
  'timers',
  'util',
]

async function getCommands(output, entry, options) {
  return Promise.all(
    entry.identifiers.map(commandIdentifier =>
      WebpackCommandPlugin(output, commandIdentifier, options)
    )
  )
}

// avoid looking it up every time
const { NODE_ENV } = process.env
const isProd = NODE_ENV === 'production'

export default function getWebpackConfig(
  argv,
  output,
  manifestFolder,
  skpmConfig
) {
  let userDefinedWebpackConfig
  try {
    if (fs.existsSync(path.join(process.cwd(), 'webpack.skpm.config.js'))) {
      userDefinedWebpackConfig = require(path.join(
        process.cwd(),
        'webpack.skpm.config.js'
      ))
    }
  } catch (err) {
    console.error(
      `${chalk.red('error')} Error while reading webpack.skpm.config.js`
    )
    console.error(err)
    process.exit(1)
  }

  const babelLoader = BabelLoader(skpmConfig)

  return async function webpackConfigGenerator(entry) {
    let plugins = [
      new webpack.EnvironmentPlugin({
        NODE_ENV: NODE_ENV || 'development', // default to 'development'
      }),
    ]
    const rules = [babelLoader]

    if (entry.isPluginCommand) {
      if (entry.handlers.find(k => k === '__skpm_run')) {
        console.error(
          `${chalk.red(
            'error'
          )} __skpm_run is a reserved keyword for handlers. Please use something else.`
        )
        process.exit(1)
      }

      plugins.push(
        new webpack.ProvidePlugin({
          fetch: require.resolve('sketch-polyfill-fetch'),
          FormData: require.resolve('sketch-polyfill-fetch/lib/form-data'),
          Promise: require.resolve('@skpm/promise'),
        }),
        new WebpackHeaderFooterPlugin(entry.handlers)
      )

      rules.push(commandResourceLoader)
      rules.push(nibLoader)
      rules.push(xcodeprojLoader)
    }

    if (argv.run && entry.isPluginCommand) {
      plugins = plugins.concat(
        await getCommands(output, entry, {
          ...argv,
          pluginIdentifier: skpmConfig && skpmConfig.identifier,
        })
      )
    }

    let webpackConfig = {
      mode: isProd ? 'production' : 'development',
      devtool: isProd ? 'none' : 'source-map',
      optimization: {
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              mangle: {
                // @see https://bugs.webkit.org/show_bug.cgi?id=171041
                // @see https://github.com/mishoo/UglifyJS2/issues/1753#issuecomment-324814782
                safari10: true,
              },
              output: {
                safari10: true,
              },
            },
          }),
        ],
      },
      module: {
        rules,
      },
      resolve: {
        mainFields: ['sketch', 'browser', 'module', 'main'],
        aliasFields: ['sketch', 'browser'],
        extensions: ['.sketch.js', '.js'],
        modules: [
          'node_modules',
          path.join(__dirname, '..', '..', 'node_modules'),
        ],
      },
      resolveLoader: {
        modules: [
          path.join(__dirname, '..', '..', 'node_modules'),
          'node_modules',
        ],
      },
      entry: entry.absolutePath,
      externals: [
        (context, request, callback) => {
          // we only want to mess with pluginCommands
          if (!entry.isPluginCommand) {
            return callback()
          }

          // sketch API
          if (/^sketch\//.test(request) || request === 'sketch') {
            return callback(null, `commonjs ${request}`)
          }
          // core modules shipped in Sketch
          if (CORE_MODULES.indexOf(request) !== -1) {
            return callback(null, `commonjs ${request}`)
          }
          return callback()
        },
      ],
      output: {
        filename: entry.script.replace(/\.(?!js)|\//g, '_'),
        library: entry.isPluginCommand ? 'exports' : undefined,
        path: entry.isPluginCommand
          ? path.join(output, 'Contents', 'Sketch')
          : path.join(output, 'Contents', 'Resources'),
      },
      plugins,
    }

    if (userDefinedWebpackConfig) {
      const resolvedUserDefinedConfig = await userDefinedWebpackConfig(
        webpackConfig,
        entry
      )
      if (resolvedUserDefinedConfig) {
        webpackConfig = merge.smart(webpackConfig, resolvedUserDefinedConfig)
      }
    }

    return webpackConfig
  }
}

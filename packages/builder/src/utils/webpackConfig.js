import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import webpack from 'webpack'
import merge from 'webpack-merge'
import Uglify from 'uglifyjs-webpack-plugin'
import WebpackCommandPlugin from './webpackCommandPlugin'
import WebpackHeaderFooterPlugin from './webpackHeaderFooterPlugin'
import BabelLoader from './babelLoader'
import resourceLoader from './resourceLoader'
import nibLoader from './nibLoader'

const CORE_MODULES = ['util', 'events', 'console', 'buffer', 'path', 'os']

async function getCommands(output, commandIdentifiers, options) {
  return Promise.all(
    commandIdentifiers.map(commandIdentifier =>
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

  return async function webpackConfigGenerator(
    file,
    commandIdentifiers,
    commandHandlers
  ) {
    const basename = path.basename(file)
    const isPluginCommand = !!commandIdentifiers

    let plugins = [
      new webpack.EnvironmentPlugin({
        NODE_ENV: NODE_ENV || 'development', // default to 'development'
      }),
      new webpack.DefinePlugin({
        'process.type': JSON.stringify('sketch'),
      }),
    ]
    const rules = [babelLoader]

    if (isPluginCommand) {
      if (commandHandlers.find(k => k === '__skpm_run')) {
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
          setTimeout: [require.resolve('@skpm/timers/timeout'), 'setTimeout'],
          clearTimeout: [
            require.resolve('@skpm/timers/timeout'),
            'clearTimeout',
          ],
          setImmediate: [
            require.resolve('@skpm/timers/immediate'),
            'setImmediate',
          ],
          clearImmediate: [
            require.resolve('@skpm/timers/immediate'),
            'clearImmediate',
          ],
          setInterval: [
            require.resolve('@skpm/timers/interval'),
            'setInterval',
          ],
          clearInterval: [
            require.resolve('@skpm/timers/interval'),
            'clearInterval',
          ],
          Promise: require.resolve('promise-polyfill'),
        }),
        new WebpackHeaderFooterPlugin(commandHandlers)
      )

      rules.push(resourceLoader)
      rules.push(nibLoader)
    }

    if (argv.run && isPluginCommand) {
      plugins = plugins.concat(
        await getCommands(output, commandIdentifiers, argv)
      )
    }

    if (isProd) {
      plugins.push(
        new Uglify({
          uglifyOptions: {
            mangle: {
              // @see https://bugs.webkit.org/show_bug.cgi?id=171041
              // @see https://github.com/mishoo/UglifyJS2/issues/1753#issuecomment-324814782
              safari10: true,
            },
          },
        })
      )
    }

    let webpackConfig = {
      mode: 'development',
      devtool: isProd ? 'none' : 'source-map',
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
      entry: path.join(isPluginCommand ? manifestFolder : process.cwd(), file),
      externals: [
        (context, request, callback) => {
          // we only want to mess with pluginCommands
          if (!isPluginCommand) {
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
        filename: basename,
        library: isPluginCommand ? 'exports' : undefined,
        path: isPluginCommand
          ? path.join(output, 'Contents', 'Sketch')
          : path.join(output, 'Contents', 'Resources'),
      },
      plugins,
    }

    if (userDefinedWebpackConfig) {
      const resolvedUserDefinedConfig = await userDefinedWebpackConfig(
        webpackConfig,
        isPluginCommand
      )
      if (resolvedUserDefinedConfig) {
        webpackConfig = merge.smart(webpackConfig, resolvedUserDefinedConfig)
      }
    }

    return webpackConfig
  }
}

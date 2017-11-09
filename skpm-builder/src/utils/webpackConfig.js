import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import webpack from 'webpack'
import WebpackCommandPlugin from './webpackCommandPlugin'
import WebpackHeaderFooterPlugin from './webpackHeaderFooterPlugin'
import BabelLoader from './babelLoader'
import resourceLoader from './resourceLoader'

async function getCommands(output, commandIdentifiers) {
  return Promise.all(
    commandIdentifiers.map(commandIdentifier =>
      WebpackCommandPlugin(output, commandIdentifier)
    )
  )
}

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

    let plugins = []
    const rules = [babelLoader]

    if (commandIdentifiers) {
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
          console: require.resolve('sketch-polyfill-console'),
          fetch: require.resolve('sketch-polyfill-fetch'),
          setTimeout: [
            require.resolve('sketch-polyfill-settimeout'),
            'setTimeout',
          ],
          clearTimeout: [
            require.resolve('sketch-polyfill-settimeout'),
            'clearTimeout',
          ],
          setInterval: [
            require.resolve('sketch-polyfill-setinterval'),
            'setInterval',
          ],
          clearInterval: [
            require.resolve('sketch-polyfill-setinterval'),
            'clearInterval',
          ],
        }),
        new WebpackHeaderFooterPlugin(commandHandlers)
      )

      rules.push(resourceLoader)
    }

    if (argv.run && commandIdentifiers) {
      plugins = plugins.concat(await getCommands(output, commandIdentifiers))
    }

    const webpackConfig = {
      module: {
        rules,
      },
      resolve: {
        extensions: ['.sketch.js', '.js'],
        modules: [
          'node_modules',
          path.join(__dirname, '..', '..', 'node_modules'),
        ],
      },
      resolveLoader: {
        modules: [
          'node_modules',
          path.join(__dirname, '..', '..', 'node_modules'),
        ],
      },
      entry: path.join(
        commandIdentifiers ? manifestFolder : process.cwd(),
        file
      ),
      output: {
        filename: basename,
        library: commandIdentifiers ? 'exports' : undefined,
        path: commandIdentifiers
          ? path.join(output, 'Contents', 'Sketch')
          : path.join(output, 'Contents', 'Resources'),
      },
      plugins,
    }

    if (userDefinedWebpackConfig) {
      await userDefinedWebpackConfig(webpackConfig, !!commandIdentifiers)
    }

    return webpackConfig
  }
}

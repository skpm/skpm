import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import webpack from 'webpack'
import WebpackCommandPlugin from './webpackCommandPlugin'
import WebpackHeaderFooterPlugin from './webpackHeaderFooterPlugin'

const header = `var that = this;
function run (key, context) {
  that.context = context;
`
// exports is defined here by webpack
const footer = definedKeys => `  if (key === 'default' && typeof exports === 'function') {
    exports(context);
  } else {
    exports[key](context);
  }
}
${definedKeys
  .map(k => {
    if (k === 'onRun') {
      return `that['${k}'] = run.bind(this, 'default')`
    }
    return `that['${k}'] = run.bind(this, '${k}')`
  })
  .join(';\n')}
`

function babelLoader(userDefinedBabelConfig) {
  return {
    test: /\.jsx?$/,
    exclude: /node_modules/,
    use: {
      loader: 'babel-loader',
      options: {
        babelrc: false,
        presets: [require('babel-preset-airbnb')],
        ...(userDefinedBabelConfig || {}),
      },
    },
  }
}

const staticResourceLoader = {
  test: /\.(jpg|png|gif|css|html|svg|sh|py)$/,
  use: {
    loader: '@skpm/file-loader',
    query: {
      raw: true,
      outputPath(url) {
        return path.join('..', 'Resources', '_webpack_resources', url)
      },
      publicPath(url) {
        return `"file://" + context.plugin.urlForResourceNamed("${url.split(
          '../Resources/'
        )[1]}").path()`
      },
    },
  },
}

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

  const babelrcPath = path.join(process.cwd(), '.babelrc')
  let userDefinedBabelConfig = null
  try {
    if (fs.existsSync(babelrcPath)) {
      userDefinedBabelConfig = JSON.parse(fs.readFileSync(babelrcPath, 'utf8'))
    } else if (skpmConfig.babel) {
      userDefinedBabelConfig = skpmConfig.babel
    }
  } catch (err) {
    console.error(`${chalk.red('error')} Error while reading babelrc`)
    console.error(err)
    process.exit(1)
  }

  return async function webpackConfigGenerator(
    file,
    commandIdentifiers,
    commandHandlers
  ) {
    const basename = path.basename(file)

    let plugins = []

    if (commandIdentifiers) {
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
        new WebpackHeaderFooterPlugin(header, footer(commandHandlers))
      )
    }

    if (argv.run && commandIdentifiers) {
      plugins = plugins.concat(await getCommands(output, commandIdentifiers))
    }

    const webpackConfig = {
      module: {
        rules: [staticResourceLoader, babelLoader(userDefinedBabelConfig)],
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

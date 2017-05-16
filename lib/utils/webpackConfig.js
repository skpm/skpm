var fs = require('fs')
var path = require('path')
var chalk = require('chalk')
var webpack = require('webpack')
var SketchCommandPlugin = require('./sketchCommandPlugin')
var objectAssign = require('object-assign')

function babelLoader (userDefinedBabelConfig) {
  var options = {
    babelrc: false,
    plugins: [require('babel-plugin-add-module-exports')]
  }

  if (userDefinedBabelConfig) {
    options = objectAssign(options, userDefinedBabelConfig)
  } else {
    options = objectAssign(options, {
      presets: [require('babel-preset-airbnb')]
    })
  }

  return {
    test: /\.jsx?$/,
    exclude: /node_modules/,
    use: {
      loader: 'babel-loader',
      options: options
    }
  }
}

module.exports = function (program, output, manifestFolder, packageJSON) {
  var userDefinedWebpackConfig = {}
  try {
    if (fs.existsSync(path.join(process.cwd(), 'webpack.config.js'))) {
      userDefinedWebpackConfig = require(path.join(process.cwd(), 'webpack.config.js'))
    }
  } catch (err) {
    console.error(chalk.red('error') + ' Error while reading webpack.config.js')
    console.error(err)
    process.exit(1)
  }

  var babelrcPath = path.join(process.cwd(), '.babelrc')
  var userDefinedBabelConfig = null
  try {
    if (fs.existsSync(babelrcPath)) {
      userDefinedBabelConfig = JSON.parse(fs.readFileSync(babelrcPath, 'utf8'))
    } else if (packageJSON.babel) {
      userDefinedBabelConfig = packageJSON.babel
    }
  } catch (err) {
    console.error(chalk.red('error') + ' Error while reading babelrc')
    console.error(err)
    process.exit(1)
  }

  return function webpackConfig (file, commandIdentifier) {
    var basename = path.basename(file)

    var plugins = userDefinedWebpackConfig.plugins || []

    if (commandIdentifier) {
      plugins.push(
        new webpack.ProvidePlugin({
          'console': 'sketch-module-console-polyfill',
          'fetch': 'sketch-module-fetch-polyfill',
          'setTimeout': ['sketch-module-settimeout-polyfill', 'setTimeout'],
          'clearTimeout': ['sketch-module-settimeout-polyfill', 'clearTimeout'],
          'setInterval': ['sketch-module-setinterval-polyfill', 'setInterval'],
          'clearInterval': ['sketch-module-setinterval-polyfill', 'clearInterval']
        })
      )
    }

    if (commandIdentifier && program.run) {
      plugins.push(
        new SketchCommandPlugin({
          bundleURL: output,
          commandIdentifier
        })
      )
    }

    return objectAssign(
      {
        module: {
          rules: [
            babelLoader(userDefinedBabelConfig)
          ]
        },
        resolve: {
          extensions: ['.sketch.js', '.js'],
          modules: [
            'node_modules',
            path.join(__dirname, '..', '..', 'node_modules')
          ]
        },
        resolveLoader: {
          modules: [
            'node_modules',
            path.join(__dirname, '..', '..', 'node_modules')
          ]
        }
      },
      userDefinedWebpackConfig,
      {
        entry: path.join(commandIdentifier ? manifestFolder : process.cwd(), file),
        output: {
          filename: basename,
          library: commandIdentifier ? 'onRun' : undefined,
          path: commandIdentifier
            ? path.join(output, 'Contents', 'Sketch')
            : path.join(output, 'Contents', 'Resources')
        },
        plugins: plugins
      }
    )
  }
}

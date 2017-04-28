var fs = require('fs')
var path = require('path')
var chalk = require('chalk')
var webpack = require('webpack')
var WebpackShellPlugin = require('./webpackShellPlugin')
var objectAssign = require('object-assign')
var config = require('./config').get()

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

function runCommand (output, commandIdentifier) {
  var command = `${config.sketchPath}/Contents/Resources/sketchtool/bin/sketchtool run "${output}" "${commandIdentifier}"`

  var handleError = (
    // check if the run command doesn't exist
    'if (echo "$res" | grep "Unknown command ‘run’"); then ' +
      'echo "Only available on Sketch 43+"; ' +
    // check if we can't find sketch
    'elif (echo "$res" | grep "such file or directory"); then ' +
      'echo "Looks like we can\'t find Sketch.app.\\nYou can specify where to look for it by running:\\n\\necho \\"sketchPath: ABSOLUTE/PATH/TO/Sketch.app\\" > ~/.skpmrc"; ' +
    // not sure why else doesn't work
    'elif (true); then ' +
      'echo "$res"; ' +
    'fi'
  )

  // run the command and redirect the stderr to stdout so that we can check against it
  return `res=$(${command} 2>&1); ${handleError}`
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
          'fetch': 'sketch-module-fetch-polyfill'
        })
      )
    }

    if (commandIdentifier && program.run) {
      plugins.push(
        new WebpackShellPlugin({
          script: runCommand(output, commandIdentifier)
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

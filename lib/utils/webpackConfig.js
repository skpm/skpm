var fs = require('fs')
var path = require('path')
var chalk = require('chalk')
var webpack = require('webpack')
var WebpackShellPlugin = require('./webpackShellPlugin')
var SketchCommandPlugin = require('./sketchCommandPlugin')
var objectAssign = require('object-assign')
var config = require('../utils/config').get()
var semver = require('semver')

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

function sketchtoolRunCommand (output, commandIdentifier, withoutActivating) {
  var command = `"${config.sketchPath}/Contents/Resources/sketchtool/bin/sketchtool" run "${output}" "${commandIdentifier}"`

  if (withoutActivating) {
    command += ' --without-activating'
  }

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

function getCommand (output, commandIdentifier, sketchVersion) {
  var command
  if (semver.satisfies(sketchVersion, '^43.0.0')) {
    command = new SketchCommandPlugin({
      bundleURL: output,
      commandIdentifier
    })
  }

  if (semver.satisfies(sketchVersion, '^44.0.0')) {
    command = new WebpackShellPlugin({
      script: sketchtoolRunCommand(output, commandIdentifier)
    })
  }

  if (semver.satisfies(sketchVersion, '>= 45.0.0')) {
    command = new WebpackShellPlugin({
      script: sketchtoolRunCommand(output, commandIdentifier, true)
    })
  }

  return command
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

  return function webpackConfig (file, commandIdentifier, sketchVersion) {
    var basename = path.basename(file)

    var plugins = userDefinedWebpackConfig.plugins || []

    if (commandIdentifier) {
      plugins.push(
        new webpack.ProvidePlugin({
          'console': require.resolve('sketch-module-console-polyfill'),
          'fetch': require.resolve('sketch-module-fetch-polyfill'),
          'setTimeout': [require.resolve('sketch-module-settimeout-polyfill'), 'setTimeout'],
          'clearTimeout': [require.resolve('sketch-module-settimeout-polyfill'), 'clearTimeout'],
          'setInterval': [require.resolve('sketch-module-setinterval-polyfill'), 'setInterval'],
          'clearInterval': [require.resolve('sketch-module-setinterval-polyfill'), 'clearInterval']
        })
      )
    }

    if (program.run && commandIdentifier) {
      plugins.push(
        getCommand(output, commandIdentifier, sketchVersion)
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

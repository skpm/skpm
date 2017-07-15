var fs = require('fs')
var path = require('path')
var chalk = require('chalk')
var webpack = require('webpack')
var WebpackShellPlugin = require('./webpackShellPlugin')
var WebpackHeaderFooterPlugin = require('./webpackHeaderFooterPlugin')
var SketchCommandPlugin = require('./sketchCommandPlugin')
var objectAssign = require('object-assign')
var config = require('../utils/config').get()
var semver = require('semver')

var header = `var that = this;
function run (key, context) {
  that.context = context;
`
// exports is defined here by webpack
var footer = (definedKeys) => `  if (key === 'default' && typeof exports === 'function') {
    exports(context);
  } else {
    exports[key](context);
  }
}
${definedKeys.map(function (k) {
  if (k === 'onRun') {
    return `that['${k}'] = run.bind(this, 'default')`
  }
  return `that['${k}'] = run.bind(this, '${k}')`
}).join(';\n')}
`

function babelLoader (userDefinedBabelConfig) {
  var options = {
    babelrc: false
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

var imageLoader = {
  test: /\.(jpg|png|gif)$/,
  use: {
    loader: '@skpm/file-loader',
    query: {
      raw: true,
      outputPath: function (url) {
        return path.join('..', 'Resources', '_webpack_images', url)
      },
      publicPath: function (url) {
        return '"file://" + context.plugin.urlForResourceNamed("' +
          url.split('../Resources/')[1] +
          '").path()'
      }
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

function getCommands (output, commandIdentifiers, sketchVersion) {
  return commandIdentifiers.map(function (commandIdentifier) {
    var command

    if (sketchVersion && semver.satisfies(sketchVersion, '^43.0.0')) {
      command = new SketchCommandPlugin({
        bundleURL: output,
        commandIdentifier
      })
    }

    if (!sketchVersion || semver.satisfies(sketchVersion, '^44.0.0')) {
      command = new WebpackShellPlugin({
        script: sketchtoolRunCommand(output, commandIdentifier)
      })
    }

    if (sketchVersion && semver.satisfies(sketchVersion, '>= 45.0.0')) {
      command = new WebpackShellPlugin({
        script: sketchtoolRunCommand(output, commandIdentifier, true)
      })
    }

    return command
  })
}

module.exports = function (program, output, manifestFolder, skpmConfig) {
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
    } else if (skpmConfig.babel) {
      userDefinedBabelConfig = skpmConfig.babel
    }
  } catch (err) {
    console.error(chalk.red('error') + ' Error while reading babelrc')
    console.error(err)
    process.exit(1)
  }

  return function webpackConfig (file, commandIdentifiers, commandHandlers, sketchVersion) {
    var basename = path.basename(file)

    var plugins = userDefinedWebpackConfig.plugins || []

    if (commandIdentifiers) {
      plugins.push(
        new webpack.ProvidePlugin({
          'console': require.resolve('sketch-polyfill-console'),
          'fetch': require.resolve('sketch-polyfill-fetch'),
          'setTimeout': [require.resolve('sketch-polyfill-settimeout'), 'setTimeout'],
          'clearTimeout': [require.resolve('sketch-polyfill-settimeout'), 'clearTimeout'],
          'setInterval': [require.resolve('sketch-polyfill-setinterval'), 'setInterval'],
          'clearInterval': [require.resolve('sketch-polyfill-setinterval'), 'clearInterval']
        }),
        new WebpackHeaderFooterPlugin(header, footer(commandHandlers))
      )
    }

    if (program.run && commandIdentifiers) {
      plugins = plugins.concat(
        getCommands(output, commandIdentifiers, sketchVersion)
      )
    }

    return objectAssign(
      {
        module: {
          rules: [
            imageLoader,
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
        entry: path.join(commandIdentifiers ? manifestFolder : process.cwd(), file),
        output: {
          filename: basename,
          library: commandIdentifiers ? 'exports' : undefined,
          path: commandIdentifiers
            ? path.join(output, 'Contents', 'Sketch')
            : path.join(output, 'Contents', 'Resources')
        },
        plugins: plugins
      }
    )
  }
}

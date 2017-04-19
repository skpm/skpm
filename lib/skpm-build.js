#!/usr/bin/env node
var fs = require('fs')
var path = require('path')
var webpack = require('webpack')
var program = require('commander')
var chalk = require('chalk')
var uniqBy = require('lodash.uniqby')
var objectAssign = require('object-assign')
var WebpackShellPlugin = require('webpack-shell-plugin')
var config = require('./utils/config').get()

var buildEmojis = ['🔧', '🔨', '⚒', '🛠', '⛏', '🔩']
function randomBuildEmoji () {
  return buildEmojis[Math.floor(Math.random() * buildEmojis.length)]
}

program
  .description('Compile the javascript files into cocoascript')
  .usage('[options]')
  .option('-w, --watch', 'Watch and rebuild automatically')
  .option('-q, --quiet', 'Hide compilation warnings')
  .option('-r, --run', 'Run plugin after compiling')
  .parse(process.argv)

var packageJSON
try {
  packageJSON = require(path.join(process.cwd(), 'package.json'))
} catch (err) {
  console.error(chalk.red('error') + ' Error while reading the package.json file')
  console.error(err)
  process.exit(1)
}

if (!packageJSON.main) {
  console.error(chalk.red('error') + ' Missing "main" field in the package.json. Should point to the ".sketchplugin" file')
  process.exit(1)
}
if (!packageJSON.manifest) {
  console.error(chalk.red('error') + ' Missing "manifest" field in the package.json. Should point to the "manifest.json" file')
  process.exit(1)
}

var output = path.join(process.cwd(), packageJSON.main)
var manifest = path.join(process.cwd(), packageJSON.manifest)

var manifestJSON
try {
  manifestJSON = require(manifest)
} catch (err) {
  console.error(err)
  process.exit(1)
}

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

if (!fs.existsSync(output)) {
  fs.mkdirSync(output)
}

if (!fs.existsSync(path.join(output, 'Contents'))) {
  fs.mkdirSync(path.join(output, 'Contents'))
}

if (!fs.existsSync(path.join(output, 'Contents', 'Sketch'))) {
  fs.mkdirSync(path.join(output, 'Contents', 'Sketch'))
}

var manifestFolder = path.dirname(manifest)

var consolePolyfill = fs.readFileSync(require.resolve('./utils/consolePolyfill'), 'utf8')

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

function webpackConfig (file, commandIdentifier) {
  var basename = path.basename(file)

  var plugins = userDefinedWebpackConfig.plugins || []

  if (commandIdentifier) {
    plugins.push(
      new webpack.BannerPlugin({
        banner: consolePolyfill,
        raw: true,
        entryOnly: true
      })
    )
  }

  if (commandIdentifier && program.run) {
    plugins.push(
      new WebpackShellPlugin({
        onBuildEnd: [
          config.sketchPath + '/Contents/Resources/sketchtool/bin/sketchtool run ' + output + ' ' + commandIdentifier
        ],
        dev: false
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
        extensions: ['.sketch.js', '.js']
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

function copyManifest () {
  return new Promise(function (resolve, reject) {
    var copy = objectAssign({}, manifestJSON)
    copy.version = manifestJSON.version || packageJSON.version
    copy.description = manifestJSON.description || packageJSON.description
    copy.homepage = manifestJSON.homepage || packageJSON.homepage
    copy.name = manifestJSON.name || packageJSON.name
    copy.disableCocoaScriptPreprocessor = typeof manifestJSON.disableCocoaScriptPreprocessor === 'undefined' ? true : manifestJSON.disableCocoaScriptPreprocessor

    copy.commands = manifestJSON.commands.map(function (command) {
      var basename = path.basename(command.script)
      return objectAssign({}, command, {script: basename})
    })

    fs.writeFile(path.join(output, 'Contents', 'Sketch', 'manifest.json'), JSON.stringify(copy, null, 2), function (err) {
      if (err) {
        reject(new Error('Error while writing the manifest: ' + err.message))
        return
      }
      resolve()
    })
  })
}

var counter = 0
var commands = uniqBy(manifestJSON.commands, function (c) { return c.script })
var steps = commands.length + (packageJSON.resources || []).length + 1
function checkEnd () {
  if (++counter >= steps) {
    console.log(chalk.green('success') + ' Plugin built')
    process.exit(0)
  }
}

function buildCallback (file, watching) {
  return function (err, stats) {
    if (err) {
      console.error(chalk.red('error') + ' Error while building ' + file)
      console.error(err.stack || err)
      if (err.details) {
        console.error(err.details)
      }
      process.exit(1)
    }

    var info = stats.toJson({
      chunks: false,
      colors: true,
      modules: false,
      assets: false,
      performance: false,
      reasons: false,
      version: false
    })

    if (stats.hasErrors()) {
      console.error(chalk.red('error') + ' Error while building ' + file)
      ;(info.errors || []).forEach(function (error) {
        console.error(error)
      })
      if (!watching) {
        process.exit(1)
      }
    } else {
      if (stats.hasWarnings() && !program.quiet) {
        (info.warnings || []).forEach(function (warning) {
          console.warn(warning)
        })
      }
      console.log(
        (watching ? '' : chalk.dim('[' + (counter + 1) + '/' + steps + '] ')) +
        randomBuildEmoji() + '  Built ' + chalk.blue(file) + ' in ' + chalk.grey(info.time) + 'ms'
      )
      if (!watching) {
        checkEnd()
      }
    }
  }
}

commands.concat(packageJSON.resources || []).forEach(function (command) {
  var file = command.script || command
  const compiler = webpack(webpackConfig(file, command.identifier))
  if (program.watch) {
    compiler.watch({}, buildCallback(file, program.watch))
  } else {
    compiler.run(buildCallback(file, program.watch))
  }
})

var now = Date.now()
copyManifest().then(function () {
  if (!program.watch) {
    console.log(chalk.dim('[' + (counter + 1) + '/' + steps + ']') + ' 🖨  Copied ' + chalk.blue(packageJSON.manifest) + ' in ' + chalk.grey(Date.now() - now) + 'ms')
    checkEnd()
  } else {
    console.log('🖨  Copied ' + chalk.blue(packageJSON.manifest) + ' in ' + chalk.grey(Date.now() - now) + 'ms')
  }
}).catch(function (err) {
  console.error(chalk.red('error') + ' Error while copying ' + packageJSON.manifest)
  console.error(err)
  if (!program.watch) {
    process.exit(1)
  }
})

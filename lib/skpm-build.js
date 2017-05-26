#!/usr/bin/env node
var fs = require('fs')
var path = require('path')
var webpack = require('webpack')
var program = require('commander')
var chalk = require('chalk')
var uniqBy = require('lodash.uniqby')
var objectAssign = require('object-assign')
var generateWebpackConfig = require('./utils/webpackConfig')
var getRepoFromPackageJSON = require('./utils/getRepoFromPackageJSON')

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

var webpackConfig = generateWebpackConfig(program, output, manifestFolder, packageJSON)

var defaultAppcastURL = 'https://raw.githubusercontent.com/' + getRepoFromPackageJSON(packageJSON) + '/master/.appcast.xml'

function copyManifest () {
  return new Promise(function (resolve, reject) {
    var copy = objectAssign({}, manifestJSON)
    copy.version = manifestJSON.version || packageJSON.version
    copy.description = manifestJSON.description || packageJSON.description
    copy.homepage = manifestJSON.homepage || packageJSON.homepage
    copy.name = manifestJSON.name || packageJSON.name
    copy.disableCocoaScriptPreprocessor = typeof manifestJSON.disableCocoaScriptPreprocessor === 'undefined' ? true : manifestJSON.disableCocoaScriptPreprocessor
    copy.appcast = manifestJSON.appcast || packageJSON.appcast || defaultAppcastURL

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

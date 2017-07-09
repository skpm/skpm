#!/usr/bin/env node
var fs = require('fs')
var path = require('path')
var program = require('commander')
var chalk = require('chalk')
var plist = require('simple-plist')
var semver = require('semver')
var getSketchVersion = require('./utils/getSketchVersion')
var exec = require('./utils/exec')
var config = require('./utils/config').get()
var getSkpmConfigFromPackageJSON = require('./utils/getSkpmConfigFromPackageJSON')

var pluginDirectory = config.pluginDirectory

function testDevMode (then) {
  var prefPath = path.join(require('os').homedir(), 'Library/Preferences/com.bohemiancoding.sketch3.plist')
  var data = plist.readFileSync(prefPath)

  if (!data.AlwaysReloadScript) {
    var yesno = require('yesno')
    console.log('The sketch developer mode is not enabled ' + chalk.dim('(http://developer.sketchapp.com/introduction/preferences/#always-reload-scripts-before-running)') + '.')
    yesno.ask('Do you want to enable it? (y/N)', false, function (ok) {
      if (ok) {
        exec.exec(`defaults write ${prefPath} AlwaysReloadScript -bool YES`)
          .then(then, then)
      } else {
        then()
      }
    })
  } else {
    then()
  }
}

program
  .description('Symlink a local plugin for development')
  .usage('[options] <path>')
  .arguments('<path>')
  .action(function (path) {
    program.path = path
  })
  .parse(process.argv)

if (!program.path) {
  program.path = '.'
}

if (program.path.indexOf(pluginDirectory) !== -1) {
  console.error(chalk.red('error') + ' The path should be the one pointing to your new plugin folder, not the sketch plugins folder')
  process.exit(1)
}

function getPath (file) {
  return program.path[0] === '/'
  ? path.join(program.path, file) // absolute path
  : path.join(process.cwd(), program.path, file) // relative path
}

var packageJSON
try {
  packageJSON = require(getPath('package.json'))
} catch (err) {
  console.error(chalk.red('error') + ' Error while reading the package.json file')
  console.error(err)
  process.exit(1)
}

var skpmConfig = getSkpmConfigFromPackageJSON(packageJSON)

if (!skpmConfig.main) {
  console.error(chalk.red('error') + ' Missing "skpm.main" fields in the package.json. Should point to the ".sketchplugin" file')
  process.exit(1)
}

if (!skpmConfig.name) {
  console.error(chalk.red('error') + ' Missing "name" field in the package.json.')
  process.exit(1)
}

console.log(chalk.dim('[1/1]') + ' 🔗  Symlinking the plugin ' + skpmConfig.name + '...')

try {
  // Create the encompassing directory if it doesn't already exist
  if (!fs.existsSync(path.join(pluginDirectory, skpmConfig.name))) {
    fs.mkdirSync(path.join(pluginDirectory, skpmConfig.name))
  }

  // Show an error if this symlink already exists
  if (fs.existsSync(path.join(pluginDirectory, skpmConfig.name, skpmConfig.main))) {
    console.log(chalk.red('error') + ' This plugin has already been linked.')
    process.exit(0)
  }

  // Create the symlink within the encompassing directory
  fs.symlinkSync(getPath(skpmConfig.main), path.join(pluginDirectory, skpmConfig.name, skpmConfig.main))

  testDevMode(function () {
    getSketchVersion().then(function (sketchVersion) {
      if (sketchVersion && semver.gte(sketchVersion, '45.0.0')) {
        console.log()
        console.log(chalk.yellow('warning') + ' Starting with Sketch 45, you need to restart Sketch for your plugin to appear in the "plugins" menu')
        console.log()
      }
    })
    console.log(chalk.green('success') + ' Plugin ' + skpmConfig.name + ' symlinked')
    console.log(chalk.blue(skpmConfig.name) + ' - ' + chalk.grey(skpmConfig.version))
    process.exit(0)
  })
} catch (err) {
  console.log(chalk.red('error') + ' Error while symlinking the plugin ' + skpmConfig.name)
  console.log((err || {}).body || err)
  process.exit(1)
}

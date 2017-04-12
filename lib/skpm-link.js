#!/usr/bin/env node
var fs = require('fs')
var path = require('path')
var program = require('commander')
var chalk = require('chalk')
var plist = require('simple-plist')
var config = require('./utils/config').get()

var pluginDirectory = config.pluginDirectory

function testDevMode (then) {
  var prefPath = path.join(require('os').homedir(), 'Library/Preferences/com.bohemiancoding.sketch3.plist')
  var data = plist.readFileSync(prefPath)

  if (!data.AlwaysReloadScript) {
    var yesno = require('yesno')
    console.log('The sketch developer mode is not enabled ' + chalk.dim('(http://developer.sketchapp.com/introduction/preferences/#always-reload-scripts-before-running)') + '.')
    yesno.ask('Do you want to enable it? (y/N)', false, function (ok) {
      if (ok) {
        data.AlwaysReloadScript = true
        plist.writeBinaryFileSync(prefPath, data)
      }
      then()
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

if (!packageJSON.main) {
  console.error(chalk.red('error') + ' Missing "main" field in the package.json. Should point to the ".sketchplugin" file')
  process.exit(1)
}

if (!packageJSON.name) {
  console.error(chalk.red('error') + ' Missing "name" field in the package.json.')
  process.exit(1)
}

console.log(chalk.dim('[1/1]') + ' 🔗  Symlinking the plugin ' + packageJSON.name + '...')

try {
  // Create the encompassing directory if it doesn't already exist
  if (!fs.existsSync(path.join(pluginDirectory, packageJSON.name))) {
    fs.mkdirSync(path.join(pluginDirectory, packageJSON.name))
  }

  // Show an error if this symlink already exists
  if (fs.existsSync(path.join(pluginDirectory, packageJSON.name, packageJSON.main))) {
    console.log(chalk.red('error') + ' This plugin has already been linked.')
    process.exit(0)
  }

  // Create the symlink within the encompassing directory
  fs.symlinkSync(getPath(packageJSON.main), path.join(pluginDirectory, packageJSON.name, packageJSON.main))

  testDevMode(function () {
    console.log(chalk.green('success') + ' Plugin ' + packageJSON.name + ' symlinked')
    console.log(chalk.blue(packageJSON.name) + ' - ' + chalk.grey(packageJSON.version))
    process.exit(0)
  })
} catch (err) {
  console.log(chalk.red('error') + ' Error while symlinking the plugin ' + packageJSON.name)
  console.log((err || {}).body || err)
  process.exit(1)
}

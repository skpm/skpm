#!/usr/bin/env node
var fs = require('fs')
var path = require('path')
var program = require('commander')
var chalk = require('chalk')
var config = require('./config').get()

var pluginDirectory = config.pluginDirectory

program
  .usage('[options] <path>')
  .arguments('<path>')
  .action(function (path) {
    program.path = path
  })
  .parse(process.argv)

if (!program.path) {
  program.help()
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
  if (!fs.existsSync(path.join(pluginDirectory, packageJSON.name))) {
    fs.mkdirSync(path.join(pluginDirectory, packageJSON.name))
  }
  fs.symlinkSync(getPath(packageJSON.main), path.join(pluginDirectory, packageJSON.name, packageJSON.main))
  console.log(chalk.green('success') + ' Plugin ' + packageJSON.name + ' symlinked')
  console.log(chalk.blue(packageJSON.name) + ' - ' + chalk.grey(packageJSON.version))
  process.exit(0)
} catch (err) {
  console.log(chalk.red('error') + ' Error while symlinking the plugin ' + packageJSON.name)
  console.log((err || {}).body || err)
  process.exit(1)
}

#!/usr/bin/env node
var fs = require('fs')
var program = require('commander')
var chalk = require('chalk')
var deleteFolder = require('./deleteFolder')

var PLUGINS_DIRECTORY = require('os').homedir() + '/Library/Application Support/com.bohemiancoding.sketch3/Plugins/'

program
  .usage('[options] <name> [otherNames...]')
  .arguments('<name> [otherNames...]')
  .action(function (name, otherNames) {
    program.names = [name]
    if (otherNames) {
      program.names = program.names.concat(otherNames)
    }
  })
  .parse(process.argv)

if (!program.names || !program.names.length) {
  program.help()
}

console.log(chalk.dim('[1/1]') + ' 🗑  Removing the plugin' + (program.names.length > 1 ? 's' : '') + '...')

try {
  program.names.forEach(function (name) {
    fs.statSync(PLUGINS_DIRECTORY + name)
  })
  program.names.forEach(function (name) {
    deleteFolder(PLUGINS_DIRECTORY + name)
  })
  console.log(chalk.green('success') + ' Plugin' + (program.names.length > 1 ? 's' : '') + ' uninstalled')
  process.exit(0)
} catch (err) {
  console.log(chalk.red('error') + ' Error while uninstalling the plugin' + (program.names.length > 1 ? 's' : ''))
  console.log((err || {}).body || err)
  process.exit(1)
}

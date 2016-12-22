#!/usr/bin/env node
var fs = require('fs')
var program = require('commander')
var ora = require('ora')
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

var spinner = ora({text: 'Removing the plugins', color: 'yellow'}).start()

try {
  program.names.forEach(function (name) {
    fs.statSync(PLUGINS_DIRECTORY + name)
  })
  program.names.forEach(function (name) {
    deleteFolder(PLUGINS_DIRECTORY + name)
  })
  spinner.text = 'Removed plugins'
  spinner.succeed()
  process.exit(0)
} catch (err) {
  spinner.fail()
  console.log((err || {}).body || err)
  process.exit(1)
}

#!/usr/bin/env node
var program = require('commander')
var chalk = require('chalk')
var registry = require('skpm-client')
var config = require('./utils/config').get()

program
  .description('Search for existing plugins')
  .usage('[options] <query>')
  .arguments('<query>')
  .action(function (query) {
    program.query = query
  })
  .parse(process.argv)

if (!program.query) {
  program.help()
}

registry.search(program.query, {registryURL: config.registryURL})
.then(function (plugins) {
  if (!plugins || !plugins.length) {
    console.log(chalk.red('error') + ' No plugins found for "' + program.query + '"')
    return process.exit(0)
  }
  plugins.forEach(function (plugin, i) {
    console.log(chalk.blue.bold(plugin.name) + ' - ' + chalk.dim.italic(plugin.lastVersion))
    console.log(plugin.description)
    if (i !== plugins.length - 1) {
      console.log()
    }
  })
  process.exit(0)
})
.catch(function (err) {
  console.log(chalk.red('error') + ' Error while searching for plugins')
  console.log((err || {}).body || err)
  process.exit(1)
})

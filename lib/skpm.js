#!/usr/bin/env node
var program = require('commander')

program
  .command('build [options] <input folder>', 'compile the javascript files into cocoascript', {isDefault: true})
  .command('publish [options] <bump>', 'publish a new version of the plugin')
  .command('login <token>', 'login to github using an access token')
  .parse(process.argv)

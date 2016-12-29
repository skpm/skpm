#!/usr/bin/env node
var program = require('commander')

program
  .command('init', 'scaffold a new plugin')
  .command('build [options]', 'compile the javascript files into cocoascript')
  .command('publish [options] <bump>', 'publish a new version of the plugin')
  .command('search <query>', 'search for plugins')
  .command('install [options] <name>', 'install a new plugin')
  .command('uninstall [options] <name>', 'uninstall a plugin')
  .command('login <token>', 'login to github using an access token')
  .command('logout', 'delete the access token')
  .parse(process.argv)

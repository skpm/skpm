#!/usr/bin/env node

import updateNotifier from 'update-notifier'
import yargs from 'yargs'
import create from './commands/create'
import log from './commands/log'
import login from './commands/login'
import logout from './commands/logout'
import publish from './commands/publish'
import pkg from '../package.json'
import checkVersion from '../check'

global.Promise = require('bluebird')

checkVersion()

updateNotifier({ pkg }).notify()

yargs
  .command(create)
  .command(publish)
  .command(log)
  .command(login)
  .command(logout)
  .usage(
    `skpm ${pkg.version}
For help with a specific command, enter:
  skpm help [command]
`
  )
  .help()
  .alias('h', 'help')
  .demandCommand()
  .strict().argv

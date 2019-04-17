#!/usr/bin/env node

import updateNotifier from 'update-notifier'
import isCI from 'is-ci'
import chalk from 'chalk'
import yargs from 'yargs'
import create from './commands/create'
import log from './commands/log'
import login from './commands/login'
import logout from './commands/logout'
import publish from './commands/publish'
import pkg from '../package.json'
import checkVersion from '../check'
import logo from './utils/logo'

checkVersion()

const notifier = updateNotifier({
  pkg,
})

if (notifier.update && notifier.update.latest !== pkg.version && !isCI) {
  const old = notifier.update.current
  const { latest } = notifier.update
  let { type } = notifier.update
  switch (type) {
    case 'major':
      type = chalk.red(type)
      break
    case 'minor':
      type = chalk.yellow(type)
      break
    case 'patch':
      type = chalk.green(type)
      break
    default:
      break
  }

  const changelog = `https://skpm.io/release-notes/`
  notifier.notify({
    message:
      `New ${type} version of ${pkg.name} available! ${chalk.red(
        old
      )} → ${chalk.green(latest)}\n` +
      `${chalk.yellow('Changelog:')} ${chalk.cyan(changelog)}\n` +
      `Run ${chalk.green(`npm install -g ${pkg.name}`)} to update!`,
  })
}

yargs
  .scriptName('skpm')
  .command(create)
  .command(publish)
  .command(log)
  .command(login)
  .command(logout)
  .usage(
    `${logo(`skpm ${pkg.version}`)}

For help with a specific command, enter:
  skpm help [command]
`
  )
  .help()
  .alias('h', 'help')
  .demandCommand()
  .strict().argv

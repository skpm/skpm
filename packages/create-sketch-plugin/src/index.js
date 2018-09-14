#!/usr/bin/env node

import yargs from 'yargs'
import create from './commands/create'

create.builder(yargs)

const { argv } = yargs
  .help()
  .alias('h', 'help')
  .demandCommand()
  .strict()

argv.dest = argv._[0] // eslint-disable-line

create.handler(argv)

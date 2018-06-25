#!/usr/bin/env node

import yargs from 'yargs'
import create from './commands/create'

const { argv } = yargs
  .options(create.builder)
  .help()
  .alias('h', 'help')
  .demandCommand()
  .strict()

argv.dest = argv._[0] // eslint-disable-line

create.handler(argv)

#!/usr/bin/env node
const childProcess = require('child_process')
const program = require('commander')
const chalk = require('chalk')
const config = require('./utils/config').get()

program
  .description('Show the Sketch.app logs')
  .usage('[options]')
  .option(
    '-f, -F',
    'The `-f` option causes tail to not stop when end of file is reached, but rather to wait for additional data to be appended to the input.'
  )
  .option(
    '-n, --number <number>',
    'Shows `number` lines of the logs.',
    parseInt
  )
  .parse(process.argv)

const args = []

if (program.F) {
  args.push('-F')
} else if (program.number) {
  args.push(`-n ${program.number}`)
}

args.push(config.logsLocation)

const child = childProcess.spawn('tail', args, {
  cwd: process.cwd(),
  stdio: 'inherit',
})

if (child.stdout) {
  child.stdout.on('data', data => {
    console.log(data)
  })
}

child.on('exit', () => {
  process.exit(0)
})

child.on('error', err => {
  console.log(`${chalk.red('error')} Error while reading the logs`)
  console.log(err)
  process.exit(1)
})

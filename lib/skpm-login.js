#!/usr/bin/env node
const program = require('commander')
const auth = require('./utils/auth')
const chalk = require('chalk')
const github = require('./utils/github')

program
  .description(
    'Enter your GitHub access token and save it to the keychain.\n This token will be used to publish new releases on the repo.\n\n You can create a new token here: https://github.com/settings/tokens/new'
  )
  .usage('<token>')
  .arguments('<token>')
  .action(token => {
    program.token = token
  })
  .parse(process.argv)

if (typeof program.token === 'undefined') {
  program.help()
}

console.log(`${chalk.dim('[1/2]')} 📦  Checking if the token is valid...`)
github
  .getUser(program.token)
  .then(() => {
    console.log(
      `${chalk.dim('[2/2]')} 📦  Saving access token to the keychain...`
    )

    auth.saveToken(program.token)

    console.log(`${chalk.green('success')} Token saved`)
    process.exit(0)
  })
  .catch(err => {
    console.error(`${chalk.red('error')} Token invalid`)
    console.error(err.err || err.body || err)
    process.exit(1)
  })

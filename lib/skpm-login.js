#!/usr/bin/env node
var program = require('commander')
var auth = require('./auth')
var ora = require('ora')
var github = require('./github')

program
  .description('Enter your GitHub access token and save it to the keychain.\n This token will be used to publish new releases on the repo.\n\n You can create a new token here: https://github.com/settings/tokens/new')
  .usage('<token>')
  .arguments('<token>')
  .action(function (token) {
    program.token = token
  })
  .parse(process.argv)

if (typeof program.token === 'undefined') {
  program.help()
}

var spinner = ora({text: 'Saving access token to the keychain', color: 'yellow'}).start()
spinner.color = 'yellow'

auth.saveToken(program.token)

spinner.text = 'Saved access token to the keychain'
spinner.succeed()
spinner = ora({text: 'Checking if the token is valid', color: 'yellow'}).start()
github.getUser(program.token).then(function () {
  spinner.text = 'Token valid'
  spinner.succeed()
}).catch(function (err) {
  spinner.text = 'Token invalid: ' + (err.err || err.body)
  spinner.fail()
})

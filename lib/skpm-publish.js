#!/usr/bin/env node
var fs = require('fs')
var path = require('path')
var program = require('commander')
var chalk = require('chalk')
var registry = require('skpm-client')
var exec = require('./exec').exec
var auth = require('./auth')
var github = require('./github')

program
  .usage('[options] <bump>')
  .option('-n, --no-registry', 'Do not push to the registry')
  .arguments('<bump>')
  .action(function (bump) {
    program.bump = bump
  })
  .parse(process.argv)

if (typeof program.bump === 'undefined') {
  program.help()
}

var token = auth.getToken()

var packageJSON
try {
  packageJSON = require(path.join(process.cwd(), 'package.json'))
} catch (err) {
  console.error(chalk.red('error') + ' Error while reading the package.json file')
  console.error(err)
  process.exit(1)
}

var repo = (packageJSON.repository || {}).url || packageJSON.repository

if (!repo) {
  console.error(chalk.red('error') + ' Missing "repository" field in the package.json.')
  process.exit(1)
}

repo = repo.split('github.com')[1]
repo = repo.substring(1).replace(/\.git$/, '')

var script = (packageJSON.scripts || {}).prepublish && 'prepublish'
if (!script) {
  script = (packageJSON.scripts || {}).build && 'build'
}

var step = 0
var steps = 8 + (script ? 1 : 0) + (!program.noRegistry && !packageJSON.private ? 1 : 0)

console.log(chalk.dim('[' + (++step) + '/' + steps + ']') + ' 🗝  Checking if repo is accessible...')

var tempZip = Date.now() + '.zip'
var tag
var releaseId
var assetURL

github.getRepo(token, repo)
.catch(function (err) {
  console.error(chalk.red('error') + ' Token invalid')
  console.error(err.err || err.body || err)
  process.exit(1)
})
.then(function () {
  console.log(chalk.dim('[' + (++step) + '/' + steps + ']') + ' 🏷  Bumping package.json version and creating git tag...')
  return exec('npm version ' + program.bump + ' -m "Publish %s release :rocket:"')
})
.then(function (res) {
  console.log(chalk.dim('[' + (++step) + '/' + steps + ']') + ' 📤  Pushing the created tag to Github...')
  tag = res.stdout.trim()
  return exec('git push -f origin HEAD ' + tag)
})
.then(function (res) {
  if (!script) { return }
  console.log(chalk.dim('[' + (++step) + '/' + steps + ']') + ' 🛠  Building the plugin...')
  return exec('npm run ' + script)
})
.then(function (res) {
  console.log(chalk.dim('[' + (++step) + '/' + steps + ']') + ' 📦  Zipping the plugin...')
  return exec('zip -r ' + tempZip + ' ' + packageJSON.main + ' -x "*.DS_Store"')
})
.then(function (res) {
  console.log(chalk.dim('[' + (++step) + '/' + steps + ']') + ' 📝  Creating a draft release on Github...')
  return github.createDraftRelease(token, repo, tag)
})
.then(function (res) {
  releaseId = res.id
  console.log(chalk.dim('[' + (++step) + '/' + steps + ']') + ' 🚀  Uploading zip asset...')
  var zipStream = fs.createReadStream(path.join(process.cwd(), tempZip))
  return github.updateAsset(token, repo, releaseId, zipStream, path.basename(packageJSON.main))
})
.then(function (res) {
  console.log(chalk.dim('[' + (++step) + '/' + steps + ']') + ' 🎉  Publishing the release...')
  return github.publishRelease(token, repo, releaseId)
})
.then(function (res) {
  assetURL = res.browser_download_url
  console.log(chalk.dim('[' + (++step) + '/' + steps + ']') + ' 🗑  Removing the local zip...')
  return exec('rm -f ' + tempZip)
})
.then(function () {
  if (!program.noRegistry && !packageJSON.private) {
    console.log(chalk.dim('[' + (++step) + '/' + steps + ']') + ' 🔔  Notifying the registry...')
    return registry.publish(token, {
      name: packageJSON.name,
      repo: repo,
      description: packageJSON.description,
      keywords: packageJSON.keywords,
      tag: tag,
      url: assetURL
    })
  }
})
.then(function (res) {
  console.log(chalk.green('success') + ' Plugin published')
  console.log(packageJSON.name + '@' + tag.replace('v', ''))
  process.exit(0)
})
.catch(function (err) {
  console.error(chalk.red('error') + ' Publication failed')
  console.error((err || {}).body || err)
  process.exit(1)
})

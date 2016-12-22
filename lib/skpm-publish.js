#!/usr/bin/env node
var fs = require('fs')
var path = require('path')
var program = require('commander')
var ora = require('ora')
var registry = require('skpm-client')
var _exec = require('child_process').exec
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

var exec = function (command, options) {
  return new Promise(function (resolve, reject) {
    _exec(command, options, function (error, stdout, stderr) {
      if (error) {
        return reject(error)
      }
      resolve({stdout, stderr})
    })
  })
}

var packageJSON
try {
  packageJSON = require(path.join(process.cwd(), 'package.json'))
} catch (err) {
  console.log(err)
  process.exit(1)
}

var repo = (packageJSON.repository || {}).url || packageJSON.repository

if (!repo) {
  console.error('Missing "repository" field in the package.json.')
  process.exit(1)
}

repo = repo.split('github.com')[1]
repo = repo.substring(1).replace(/\.git$/, '')

var spinner = ora({text: 'Checking if repo is accessible', color: 'yellow'}).start()

var tempZip = Date.now() + '.zip'
var tag
var releaseId
var assetURL

github.getRepo(token, repo)
.then(function () {
  spinner.text = 'Repo accessible'
  spinner.succeed()
})
.catch(function (err) {
  spinner.text = 'Token invalid: ' + (err.err || err.body)
  spinner.fail()
  process.exit(1)
})
.then(function () {
  spinner = ora({text: 'Bumping package.json version and creating tag', color: 'yellow'}).start()
  return exec('npm version ' + program.bump + ' -m "Publish %s release :rocket:"')
})
.then(function (res) {
  spinner.text = 'Bumped package.json version and created tag'
  spinner.succeed()
  spinner = ora({text: 'Push the created tag to github', color: 'yellow'}).start()
  tag = res.stdout.trim()
  return exec('git push -f origin HEAD ' + tag)
})
.then(function (res) {
  spinner.succeed()
  var script = (packageJSON.scripts || {}).prepublish && 'prepublish'
  if (!script) {
    script = (packageJSON.scripts || {}).build && 'build'
  }
  if (!script) { return }
  spinner = ora({text: 'Building plugin', color: 'yellow'}).start()
  return exec('npm run ' + script).then(function () {
    spinner.text = 'Built plugin'
    spinner.succeed()
  })
})
.then(function (res) {
  spinner = ora({text: 'Zipping plugin', color: 'yellow'}).start()
  return exec('zip -r ' + tempZip + ' ' + packageJSON.main + ' -x "*.DS_Store"')
})
.then(function (res) {
  spinner.text = 'Zipped plugin'
  spinner.succeed()
  spinner = ora({text: 'Creating draft release', color: 'yellow'}).start()
  return github.createDraftRelease(token, repo, tag)
})
.then(function (res) {
  releaseId = res.id
  spinner.text = 'Created draft release (id: ' + releaseId + ')'
  spinner.succeed()
  spinner = ora({text: 'Uploading zip asset', color: 'yellow'}).start()
  var zipStream = fs.createReadStream(path.join(process.cwd(), tempZip))
  return github.updateAsset(token, repo, releaseId, zipStream, path.basename(packageJSON.main))
})
.then(function (res) {
  spinner.text = 'Uploaded zip asset'
  spinner.succeed()
  spinner = ora({text: 'Publishing release', color: 'yellow'}).start()
  return github.publishRelease(token, repo, releaseId)
})
.then(function (res) {
  assetURL = res.browser_download_url
  spinner.text = 'Published release'
  spinner.succeed()
  spinner = ora({text: 'Removing zip asset', color: 'yellow'}).start()
  return exec('rm -f ' + tempZip)
})
.then(function () {
  spinner.text = 'Removed zip asset'
  spinner.succeed()
  if (!program.noRegistry) {
    spinner = ora({text: 'Notifying the registry', color: 'yellow'}).start()
    return registry.publish(token, {
      name: packageJSON.name,
      repo: repo,
      description: packageJSON.description,
      keywords: packageJSON.keywords,
      tag: tag,
      url: assetURL
    }).then(function () {
      spinner.text = 'Registry notified'
      spinner.succeed()
    })
  }
})
.then(function (res) {
  process.exit(0)
})
.catch(function (err) {
  spinner.fail()
  console.log((err || {}).body || err)
  process.exit(1)
})

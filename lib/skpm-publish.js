#!/usr/bin/env node
var path = require('path')
var fs = require('fs')
var program = require('commander')
var chalk = require('chalk')
var xml2js = require('xml2js')
var open = require('open')
var exec = require('./utils/exec').exec
var auth = require('./utils/auth')
var github = require('./utils/github')
var getRepoFromPackageJSON = require('./utils/getRepoFromPackageJSON')

var EMPTY_APPCAST = {
  rss: {
    $: {
      'xmlns:sparkle': 'http://www.andymatuschak.org/xml-namespaces/sparkle',
      'xmlns:dc': 'http://purl.org/dc/elements/1.1/',
      version: '2.0'
    },
    channel: [{ item: [] }]
  }
}

program
  .description('Publish a new version of the plugin')
  .usage('[options] <bump>')
  .option('-o, --open-release', 'Open the newly created release on Github.com')
  .option('-n, --no-registry', 'Do not push to the registry')
  .option('-u, --repo-url <repoURL>', 'Specify the repository URL (default to the one specified in package.json)')
  .arguments('<bump>')
  .action(function (bump) {
    program.bump = bump
  })
  .parse(process.argv)

var token

var packageJSON
try {
  packageJSON = require(path.join(process.cwd(), 'package.json'))
} catch (err) {
  console.error(chalk.red('error') + ' Error while reading the package.json file')
  console.error(err)
  process.exit(1)
}

if (!packageJSON.name) {
  console.error(chalk.red('error') + ' Missing "name" field in the package.json.')
  process.exit(1)
}

var repo = getRepoFromPackageJSON((program.repoUrl && {repository: program.repoUrl}) || packageJSON)

if (!repo) {
  console.error(chalk.red('error') + ' Missing "repository" field in the package.json.')
  process.exit(1)
}

var script = (packageJSON.scripts || {}).prepublish && 'prepublish'
if (!script) {
  script = (packageJSON.scripts || {}).build && 'build'
}

var tempZip = Date.now() + '.zip'
var tag
var releaseId

var step = 0
var steps = 8
if (script) {
  steps += 1
}
if (!program.noRegistry && !packageJSON.private) {
  steps += 1
}
if (typeof program.bump === 'undefined') {
  steps -= 3
  tag = packageJSON.version
}

console.log(chalk.dim('[' + (++step) + '/' + steps + ']') + ' 🗝  Checking if `' + repo + '` is accessible...')

auth.getToken().then(function (_token) {
  token = _token
  return github.getRepo(token, repo)
})
.catch(function (err) {
  console.error(chalk.red('error') + ' Token invalid')
  console.error(err)
  process.exit(1)
})
.then(function () {
  if (typeof program.bump === 'undefined') {
    return
  }
  console.log(chalk.dim('[' + (++step) + '/' + steps + ']') + ' 🏷  Bumping package.json version and creating git tag...')
  return exec('npm version ' + program.bump + ' -m "Publish %s release :rocket:"')
})
.then(function (res) {
  if (typeof program.bump === 'undefined') {
    return
  }
  console.log(chalk.dim('[' + (++step) + '/' + steps + ']') + ' 🗂  Updating the appcast file...')
  tag = res.stdout.trim()
  var appcast = path.join(process.cwd(), '.appcast.xml')
  return new Promise(function (resolve, reject) {
    fs.readFile(appcast, function (err, data) {
      if (err) {
        return resolve(EMPTY_APPCAST)
      }
      xml2js.parseString(data, function (err, result) {
        if (err) {
          return resolve(EMPTY_APPCAST)
        }
        resolve(result)
      })
    })
  }).then(function (appcastObj) {
    appcastObj.rss.channel[0].item.unshift({
      enclosure: [{
        $: {
          url: 'https://github.com/' + repo + '/releases/download/' + tag + '/' + path.basename(packageJSON.main) + '.zip',
          'sparkle:version': tag.replace('v', '')
        }
      }]
    })
    var builder = new xml2js.Builder()
    return builder.buildObject(appcastObj)
  }).then(function (xml) {
    return new Promise(function (resolve, reject) {
      fs.writeFile(appcast, xml, function (err, data) {
        if (err) {
          return reject(err)
        }
        resolve(data)
      })
    })
  }).then(function () {
    return exec('git add "' + appcast + '"')
  }).then(function () {
    return exec('git commit -m "Update .appcast with new tag :sparkles:"')
  })
})
.then(function (res) {
  if (typeof program.bump === 'undefined') {
    return
  }
  console.log(chalk.dim('[' + (++step) + '/' + steps + ']') + ' 📤  Pushing the created tag to Github...')
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
  return github.updateAsset(token, repo, releaseId, tempZip, path.basename(packageJSON.main) + '.zip')
})
.then(function () {
  console.log(chalk.dim('[' + (++step) + '/' + steps + ']') + ' 🎉  Publishing the release...')
  return github.publishRelease(token, repo, releaseId)
})
.then(function (res) {
  console.log(chalk.dim('[' + (++step) + '/' + steps + ']') + ' 🗑  Removing the local zip...')
  return exec('rm -f ' + tempZip)
})
.then(function () {
  if (!program.noRegistry && !packageJSON.private) {
    console.log(chalk.dim('[' + (++step) + '/' + steps + ']') + ' 🔔  Publishing the plugin on the official plugin directory...')
    return github.addPluginToPluginsRegistryRepo(token, packageJSON, repo)
  }
})
.then(function (res) {
  console.log(chalk.green('success') + ' Plugin published')
  console.log(packageJSON.name + '@' + tag.replace('v', ''))
  if (program.openRelease) {
    open('https://github.com/' + repo + '/tag/' + tag.replace('v', ''))
  }
  process.exit(0)
})
.catch(function (err) {
  console.error(chalk.red('error') + ' Publication failed')
  console.error(err)
  process.exit(1)
})

#!/usr/bin/env node
var fs = require('fs')
var https = require('https')
var deleteFolder = require('./deleteFolder')
var program = require('commander')
var chalk = require('chalk')
var semver = require('semver')
var Admzip = require('adm-zip')
var registry = require('skpm-client')

var PLUGINS_DIRECTORY = require('os').homedir() + '/Library/Application Support/com.bohemiancoding.sketch3/Plugins/'

program
  .usage('[options] <name> [otherNames...]')
  .arguments('<name> [otherNames...]')
  .action(function (name, otherNames) {
    program.names = [name]
    if (otherNames) {
      program.names = program.names.concat(otherNames)
    }
  })
  .parse(process.argv)

if (!program.names || !program.names.length) {
  program.help()
}

var downloadAndExtract = function (v) {
  var singleFile = /\.sketchplugin$/.test(v.url)
  var tempFile = singleFile
    ? (PLUGINS_DIRECTORY + v.name + '/' + decodeURIComponent(v.url.split('/')[v.url.split('/').length - 1]))
    : Date.now() + '.zip'
  fs.mkdirSync(PLUGINS_DIRECTORY + v.name)
  return new Promise(function (resolve, reject) {
    https.get(v.url, function (response) {
      response.on('error', function (err) {
        deleteFolder(PLUGINS_DIRECTORY + v.name)
        reject(err)
      })
      response.on('data', function (data) {
        fs.appendFileSync(tempFile, data)
      })
      response.on('end', function () {
        if (!singleFile) {
          var zip = new Admzip(tempFile)
          var zipEntries = zip.getEntries()
          zipEntries.filter(function (zipEntry) {
            return /\.sketchplugin$/.test(zipEntry.entryName)
          }).forEach(function (zipEntry) {
            zip.extractEntryTo(zipEntry, PLUGINS_DIRECTORY + v.name, true, true)
          })
          zip.extractAllTo(PLUGINS_DIRECTORY)
          fs.unlink(tempFile)
        }
        resolve(v)
      })
    })
  })
}

console.log(chalk.dim('[1/3]') + ' 🗄  Getting the plugin' + (program.names.length > 1 ? 's' : '') + ' information...')

Promise.all(program.names.map(function (name) {
  return registry.get(name.split('@')[0])
}))
.then(function (plugins) {
  console.log(chalk.dim('[2/3]') + ' 🗂  Finding the plugin' + (program.names.length > 1 ? 's' : '') + ' version...')
  return plugins.map(function (plugin, i) {
    if (!plugin.versions) {
      throw new Error('No version published for the plugin ' + plugin.name)
    }
    var requiredVersion = program.names[i].split('@')[1]
    var version
    if (requiredVersion) {
      version = plugin.versions.filter(function (v) {
        return semver.eq(v.tag, requiredVersion)
      })[0]
    } else {
      version = plugin.versions.sort(semver.rcompare)[0]
    }
    if (!version) {
      throw new Error('No version found for the plugin ' + plugin.name)
    }
    version.name = plugin.name
    return version
  })
})
.then(function (versions) {
  console.log(chalk.dim('[3/3]') + ' 💾  Downloading and installing the plugin' + (program.names.length > 1 ? 's' : '') + '...')
  return Promise.all(versions.map(function (v) {
    return downloadAndExtract(v)
  }))
})
.then(function (versions) {
  console.log(chalk.green('success') + ' Plugin' + (program.names.length > 1 ? 's' : '') + ' installed')
  versions.forEach(function (v) {
    console.log(chalk.blue(v.name) + ' - ' + chalk.grey(v.tag))
  })
  process.exit(0)
})
.catch(function (err) {
  console.log(chalk.red('error') + ' Error while installing the plugin' + (program.names.length > 1 ? 's' : ''))
  console.log((err || {}).body || err)
  process.exit(1)
})

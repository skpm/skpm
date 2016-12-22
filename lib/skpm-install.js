#!/usr/bin/env node
var fs = require('fs')
var https = require('https')
var deleteFolder = require('deleteFolder')
var program = require('commander')
var ora = require('ora')
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

var downloadAndExtract = function (url, name) {
  var singleFile = /\.sketchplugin$/.test(url)
  var tempFile = singleFile
    ? (PLUGINS_DIRECTORY + name + '/' + decodeURIComponent(url.split('/')[url.split('/').length - 1]))
    : Date.now() + '.zip'
  fs.mkdirSync(PLUGINS_DIRECTORY + name)
  return new Promise(function (resolve, reject) {
    https.get(url, function (response) {
      response.on('error', function (err) {
        deleteFolder(PLUGINS_DIRECTORY + name)
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
            zip.extractEntryTo(zipEntry, PLUGINS_DIRECTORY + name, true, true)
          })
          zip.extractAllTo(PLUGINS_DIRECTORY)
          fs.unlink(tempFile)
        }
        resolve()
      })
    })
  })
}

var spinner = ora({text: 'Getting the plugins information', color: 'yellow'}).start()

Promise.all(program.names.map(function (name) {
  return registry.get(name.split('@')[0])
}))
.then(function (plugins) {
  spinner.text = 'Got the plugins information'
  spinner.succeed()
  spinner = ora({text: 'Finding the plugins versions', color: 'yellow'}).start()
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
  spinner.text = 'Found the plugins versions'
  spinner.succeed()
  spinner = ora({text: 'Downloading the plugins', color: 'yellow'}).start()
  return Promise.all(versions.map(function (v) {
    return downloadAndExtract(v.url, v.name)
  }))
})
.then(function (res) {
  spinner.text = 'Downloaded and installed plugins'
  spinner.succeed()
  process.exit(0)
})
.catch(function (err) {
  spinner.fail()
  console.log((err || {}).body || err)
  process.exit(1)
})

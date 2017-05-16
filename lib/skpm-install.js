#!/usr/bin/env node
var fs = require('fs')
var path = require('path')
var https = require('https')
var program = require('commander')
var chalk = require('chalk')
var semver = require('semver')
var Admzip = require('adm-zip')
var registry = require('skpm-client')
var Config = require('./utils/config')
var deleteFolder = require('./utils/deleteFolder')
var objectAssign = require('object-assign')
var getSketchVersion = require('./utils/getSketchVersion')

var config = Config.get()

var pluginDirectory = config.pluginDirectory

program
  .description('Install a new plugin')
  .usage('[options] <name> [otherNames...]')
  .arguments('<name> [otherNames...]')
  .action(function (name, otherNames) {
    program.names = [name]
    if (otherNames) {
      program.names = program.names.concat(otherNames)
    }
  })
  .parse(process.argv)

// if no plugin specified, install the stored config
if (!program.names || !program.names.length) {
  program.names = Object.keys(config.plugins).map(function (name) {
    return name + '@' + config.plugins[name]
  })
}

if (!program.names || !program.names.length) {
  program.help()
}

var downloadAndExtract = function (v) {
  var singleFile = /\.sketchplugin$/.test(v.url)
  var tempFile = singleFile
    ? (pluginDirectory + v.name + '/' + decodeURIComponent(v.url.split('/')[v.url.split('/').length - 1]))
    : Date.now() + '.zip'
  fs.mkdirSync(path.join(pluginDirectory, v.name))
  return new Promise(function (resolve, reject) {
    https.get(v.url, function (response) {
      response.on('error', function (err) {
        deleteFolder(path.join(pluginDirectory, v.name))
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
            zip.extractEntryTo(zipEntry, path.join(pluginDirectory, v.name), true, true)
          })
          zip.extractAllTo(pluginDirectory)
          fs.unlink(tempFile)
        }
        resolve(v)
      })
    })
  })
}

console.log(chalk.dim('[1/3]') + ' 🗄  Getting the plugin' + (program.names.length > 1 ? 's' : '') + ' information...')

Promise.all(program.names.map(function (name) {
  return registry.get(name.split('@')[0], {registryURL: config.registryURL})
}))
.then(function (plugins) {
  console.log(chalk.dim('[2/3]') + ' 🗂  Finding the plugin' + (program.names.length > 1 ? 's' : '') + ' version...')
  return getSketchVersion().then(function (sketchVersion) {
    return plugins.map(function (plugin, i) {
      if (!plugin.versions) {
        throw new Error('No version published for the plugin ' + plugin.name)
      }
      var requiredVersion = program.names[i].split('@')[1]
      var version
      var versions = plugin.versions
      if (requiredVersion) {
        versions = plugin.versions.filter(function (v) {
          return semver.satisfies(v.tag, requiredVersion)
        })
        if (!versions.length) {
          throw new Error('No version satisfying `' + requiredVersion + '` found for the plugin ' + plugin.name)
        }
      }
      if (sketchVersion) {
        versions = plugin.versions.filter(function (v) {
          return !v.compatibleVersion || semver.satisfies(sketchVersion, v.compatibleVersion)
        })
        if (!versions.length) {
          throw new Error('No version compatible with Sketch ' + sketchVersion + ' found for the plugin ' + plugin.name + '. Try updating Sketch or ask the developer to publish a new version compatible.')
        }
      }
      version = versions.sort(semver.rcompare)[0]
      version.name = plugin.name
      return version
    })
  })
})
.then(function (versions) {
  console.log(chalk.dim('[3/3]') + ' 💾  Downloading and installing the plugin' + (program.names.length > 1 ? 's' : '') + '...')
  return Promise.all(versions.map(function (v) {
    return downloadAndExtract(v)
  }))
})
.then(function (versions) {
  objectAssign(config.plugins, program.names.reduce(function (prev, plugin) {
    prev[plugin.split('@')[0]] = plugin.split('@')[1] || '*'
    return prev
  }))
  Config.save(config)
  return versions
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

#!/usr/bin/env node
var fs = require('fs')
var path = require('path')
var watch = require('rollup-watch')
var rollup = require('rollup')
var program = require('commander')
var babel = require('rollup-plugin-babel')
var cleanup = require('rollup-plugin-cleanup')
var replace = require('rollup-plugin-post-replace')
var commonjs = require('rollup-plugin-commonjs')
var nodeResolve = require('rollup-plugin-node-resolve')

program
  .usage('[options] <input folder>')
  .arguments('<folder>')
  .option('-o, --output <output>', 'The .sketchplugin file')
  .option('-m, --manifest <manifest>', 'The manifest file')
  .option('-w, --watch', 'Watch and rebuild automatically')
  .action(function (folder) {
    program.inputFolder = folder
  })
  .parse(process.argv)

if (typeof program.inputFolder === 'undefined' || typeof program.output === 'undefined') {
  program.help()
}

if (!fs.existsSync(program.output)) {
  fs.mkdirSync(program.output)
}

function rollupConfig (file) {
  return {
    entry: path.join(program.inputFolder, file),
    plugins: [
      babel(),
      nodeResolve({
        jsnext: true,
        main: true
      }),
      commonjs({
        ignoreGlobal: false
      }),
      cleanup({ sourceType: 'module' }),
      replace({ 'module.exports': 'var onRun' })
    ]
  }
}

function destConfig (file) {
  return {
    intro: 'var console = {log: log, warn: log, error: log};',
    useStrict: false,
    format: 'cjs',
    dest: path.join(program.output, 'Contents', 'Sketch', file.replace('.js', '.cocoascript'))
  }
}

function copyManifest () {
  return new Promise(function (resolve, reject) {
    var manifest
    var packageJSON
    try {
      packageJSON = require(path.join(process.cwd(), 'package.json'))
      manifest = require(path.join(process.cwd(), program.manifest))
    } catch (err) {
      reject(err)
      return
    }
    manifest.version = manifest.version || packageJSON.version
    manifest.description = manifest.description || packageJSON.description
    manifest.homepage = manifest.homepage || packageJSON.homepage
    manifest.name = manifest.name || packageJSON.name
    manifest.name = manifest.name || packageJSON.name

    fs.writeFile(path.join(program.output, 'Contents', 'Sketch', 'manifest.json'), JSON.stringify(manifest, null, 2), function (err) {
      if (err) {
        reject('Error while writing the manifest: ' + err.message)
        return
      }
      resolve()
    })
  })
}

var tasks = [{
  title: 'Building commands',
  task: function () {
    return new Promise(function (resolve, reject) {
      fs.readdir(program.inputFolder, (err, files) => {
        if (err) {
          reject('Error while reading the input folder: ' + err.message)
          return
        }
        Promise.all(files.map(file => {
          return rollup.rollup(rollupConfig(file)).then(function (bundle) {
            return bundle.write(destConfig(file))
          })
        }))
        .then(function () {
          resolve()
        }).catch(function (err) {
          reject(err)
        })
      })
    })
  }
}]

if (typeof program.manifest !== 'undefined') {
  tasks.push({
    title: 'Generating manifest',
    task: copyManifest
  })
}

var ora = require('ora')
var spinner = ora({text: 'Reading input folder', color: 'yellow'}).start()
spinner.color = 'yellow'

var counter = 0
fs.readdir(program.inputFolder, (err, files) => {
  if (err) {
    spinner.text = 'Error while reading the input folder: ' + err.message
    spinner.fail()
    process.exit(1)
  }
  if (program.watch) {
    spinner.text = 'Watching input folder'
    spinner.stopAndPersist('👀')
    spinner = ora({text: 'Start building', color: 'yellow'}).start()
  } else {
    spinner.text = 'Building...'
  }
  files.map(file => {
    if (program.watch) {
      const watcher = watch(rollup, Object.assign(rollupConfig(file), destConfig(file)))
      watcher.on('event', function (event) {
        switch (event.code) {
          case 'BUILD_START':
            spinner.text = 'Start building ' + file
            break
          case 'BUILD_END':
            spinner.text = 'Built ' + file + ' in ' + event.duration + 'ms'
            spinner.succeed()
            spinner = ora({text: 'Looking for changes', color: 'yellow'}).start()
            break
          case 'ERROR':
            spinner.text = 'Error while building ' + file + ':' + event.error
            spinner.fail()
            spinner = ora({text: 'Looking for changes', color: 'yellow'}).start()
        }
      })
    } else {
      var now = Date.now()
      rollup.rollup(rollupConfig(file)).then(function (bundle) {
        return bundle.write(destConfig(file))
      }).then(function () {
        spinner.text = 'Built ' + file + ' in ' + (Date.now() - now) + 'ms'
        spinner.succeed()
        if (++counter < files.length) {
          spinner = ora({text: 'Building...', color: 'yellow'}).start()
        }
      }).catch(function (err) {
        spinner.text = 'Error while building ' + file + ':' + err
        spinner.fail()
        process.exit(1)
      })
    }
  })
})

if (typeof program.manifest !== 'undefined') {
  var text = program.watch ? 'Looking for changes' : 'Building...'
  function watchManifest () { // eslint-disable-line
    spinner.text = 'Start copying ' + program.manifest
    var now = Date.now()
    copyManifest().then(function () {
      spinner.text = 'Copied ' + program.manifest + ' in ' + (Date.now() - now) + 'ms'
      spinner.succeed()
      spinner = ora({text: text, color: 'yellow'}).start()
    }).catch(function (err) {
      spinner.text = err
      spinner.fail()
      spinner = ora({text: text, color: 'yellow'}).start()
    })
  }
  watchManifest()
  if (program.watch) {
    fs.watch(path.join(process.cwd(), program.manifest), watchManifest)
    fs.watch(path.join(process.cwd(), 'package.json'), watchManifest)
  }
}

#!/usr/bin/env node
var fs = require('fs')
var path = require('path')
var watch = require('rollup-watch')
var rollup = require('rollup')
var program = require('commander')
var ora = require('ora')
var babel = require('rollup-plugin-babel')
var cleanup = require('rollup-plugin-cleanup')
var replace = require('rollup-plugin-post-replace')
var commonjs = require('rollup-plugin-commonjs')
var nodeResolve = require('rollup-plugin-node-resolve')

program
  .usage('[options]')
  .option('-w, --watch', 'Watch and rebuild automatically')
  .parse(process.argv)

var packageJSON
try {
  packageJSON = require(path.join(process.cwd(), 'package.json'))
} catch (err) {
  console.error(err)
  process.exit(1)
}

if (!packageJSON.main) {
  console.error('Missing "main" field in the package.json. Should point to the ".sketchplugin" file')
  process.exit(1)
}
if (!packageJSON.manifest) {
  console.error('Missing "manifest" field in the package.json. Should point to the "manifest.json" file')
  process.exit(1)
}

var output = path.join(process.cwd(), packageJSON.main)
var manifest = path.join(process.cwd(), packageJSON.manifest)

var manifestJSON
try {
  manifestJSON = require(manifest)
} catch (err) {
  console.error(err)
  process.exit(1)
}

if (!fs.existsSync(path.join(output, 'Contents', 'Sketch'))) {
  fs.mkdirSync(path.join(output, 'Contents', 'Sketch'))
}

var manifestFolder = path.dirname(manifest)
function rollupConfig (file) {
  return {
    entry: path.join(manifestFolder, file),
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

var consolePolyfill = fs.readFileSync(require.resolve('./consolePolyfill'), 'utf8')

function destConfig (file) {
  var basename = path.basename(file)
  return {
    intro: consolePolyfill,
    useStrict: false,
    format: 'cjs',
    dest: path.join(output, 'Contents', 'Sketch', basename.replace('.js', '.cocoascript'))
  }
}

function copyManifest () {
  return new Promise(function (resolve, reject) {
    var copy = Object.assign({}, manifestJSON)
    copy.version = manifestJSON.version || packageJSON.version
    copy.description = manifestJSON.description || packageJSON.description
    copy.homepage = manifestJSON.homepage || packageJSON.homepage
    copy.name = manifestJSON.name || packageJSON.name
    copy.disableCocoaScriptPreprocessor = typeof manifestJSON.disableCocoaScriptPreprocessor === 'undefined' ? true : manifestJSON.disableCocoaScriptPreprocessor

    copy.commands = manifestJSON.commands.map(function (command) {
      var basename = path.basename(command.script)
      return Object.assign({}, command, {script: basename.replace('.js', '.cocoascript')})
    })

    fs.writeFile(path.join(output, 'Contents', 'Sketch', 'manifest.json'), JSON.stringify(copy, null, 2), function (err) {
      if (err) {
        reject('Error while writing the manifest: ' + err.message)
        return
      }
      resolve()
    })
  })
}

var spinner = ora({text: 'Building...', color: 'yellow'}).start()
spinner.color = 'yellow'
if (program.watch) {
  spinner.text = 'Watching input folder'
  spinner.stopAndPersist('👀')
  spinner = ora({text: 'Start building', color: 'yellow'}).start()
}

var counter = 0
manifestJSON.commands.forEach(function (command) {
  var file = command.script
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
      if (++counter < manifestJSON.commands.length) {
        spinner = ora({text: 'Building...', color: 'yellow'}).start()
      }
    }).catch(function (err) {
      spinner.text = 'Error while building ' + file + ':' + err
      spinner.fail()
      process.exit(1)
    })
  }
})

spinner.text = 'Start copying ' + packageJSON.manifest
var now = Date.now()
copyManifest().then(function () {
  spinner.text = 'Copied ' + packageJSON.manifest + ' in ' + (Date.now() - now) + 'ms'
  spinner.succeed()
  spinner = ora({text: 'Building...', color: 'yellow'}).start()
}).catch(function (err) {
  spinner.text = err
  spinner.fail()
  spinner = ora({text: 'Building...', color: 'yellow'}).start()
})

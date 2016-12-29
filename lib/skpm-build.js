#!/usr/bin/env node
var fs = require('fs')
var path = require('path')
var watch = require('rollup-watch')
var rollup = require('rollup')
var program = require('commander')
var chalk = require('chalk')
var babel = require('rollup-plugin-babel')
var cleanup = require('rollup-plugin-cleanup')
var replace = require('rollup-plugin-post-replace')
var commonjs = require('rollup-plugin-commonjs')
var nodeResolve = require('rollup-plugin-node-resolve')

var buildEmojis = ['🔧', '🔨', '⚒', '🛠', '⛏', '🔩']
function randomBuildEmoji () {
  return buildEmojis[Math.floor(Math.random() * buildEmojis.length)]
}

program
  .usage('[options]')
  .option('-w, --watch', 'Watch and rebuild automatically')
  .parse(process.argv)

var packageJSON
try {
  packageJSON = require(path.join(process.cwd(), 'package.json'))
} catch (err) {
  console.error(chalk.red('error') + ' Error while reading the package.json file')
  console.error(err)
  process.exit(1)
}

if (!packageJSON.main) {
  console.error(chalk.red('error') + ' Missing "main" field in the package.json. Should point to the ".sketchplugin" file')
  process.exit(1)
}
if (!packageJSON.manifest) {
  console.error(chalk.red('error') + ' Missing "manifest" field in the package.json. Should point to the "manifest.json" file')
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

var counter = 0
var steps = manifestJSON.commands.length + 1
function checkEnd () {
  if (++counter >= steps) {
    console.log(chalk.green('success') + ' Plugin built')
    process.exit(0)
  }
}

manifestJSON.commands.forEach(function (command) {
  var file = command.script
  if (program.watch) {
    const watcher = watch(rollup, Object.assign(rollupConfig(file), destConfig(file)))
    watcher.on('event', function (event) {
      switch (event.code) {
        case 'BUILD_START':
          break
        case 'BUILD_END':
          console.log(randomBuildEmoji() + '  Built ' + chalk.blue(file) + ' in ' + chalk.grey(event.duration) + 'ms')
          break
        case 'ERROR':
          console.error(chalk.red('error') + 'Error while building ' + file)
          console.error(event.error)
          break
      }
    })
  } else {
    var now = Date.now()
    rollup.rollup(rollupConfig(file)).then(function (bundle) {
      return bundle.write(destConfig(file))
    }).then(function () {
      console.log(chalk.dim('[' + (counter + 1) + '/' + steps + '] ') + randomBuildEmoji() + '  Built ' + chalk.blue(file) + ' in ' + chalk.grey(Date.now() - now) + 'ms')
      checkEnd()
    }).catch(function (err) {
      console.error(chalk.red('error') + 'Error while building ' + file)
      console.error(err)
      process.exit(1)
    })
  }
})

var now = Date.now()
copyManifest().then(function () {
  if (!program.watch) {
    console.log(chalk.dim('[' + (counter + 1) + '/' + steps + ']') + ' 🖨  Copied ' + chalk.blue(packageJSON.manifest) + ' in ' + chalk.grey(Date.now() - now) + 'ms')
    checkEnd()
  } else {
    console.log('🖨  Copied ' + chalk.blue(packageJSON.manifest) + ' in ' + chalk.grey(Date.now() - now) + 'ms')
  }
}).catch(function (err) {
  console.error(chalk.red('error') + ' Error while copying ' + packageJSON.manifest)
  console.error(err)
  if (!program.watch) {
    process.exit(1)
  }
})

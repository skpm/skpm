#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const webpack = require('webpack')
const program = require('commander')
const parseAuthor = require('parse-author')
const chalk = require('chalk')
const objectAssign = require('object-assign')
const glob = require('glob')
const generateWebpackConfig = require('./utils/webpackConfig')
const getSkpmConfigFromPackageJSON = require('./utils/getSkpmConfigFromPackageJSON')
const getSketchVersion = require('./utils/getSketchVersion')

const buildEmojis = ['🔧', '🔨', '⚒', '🛠', '⛏', '🔩']
function randomBuildEmoji() {
  return buildEmojis[Math.floor(Math.random() * buildEmojis.length)]
}

program
  .description('Compile the javascript files into cocoascript')
  .usage('[options]')
  .option('-w, --watch', 'Watch and rebuild automatically')
  .option('-q, --quiet', 'Hide compilation warnings')
  .option('-r, --run', 'Run plugin after compiling')
  .parse(process.argv)

let packageJSON
try {
  packageJSON = require(path.join(process.cwd(), 'package.json'))
} catch (err) {
  console.error(
    `${chalk.red('error')} Error while reading the package.json file`
  )
  console.error(err)
  process.exit(1)
}

const skpmConfig = getSkpmConfigFromPackageJSON(packageJSON)

if (!skpmConfig.main) {
  console.error(
    `${chalk.red(
      'error'
    )} Missing "skpm.main" fields in the package.json. Should point to the ".sketchplugin" file`
  )
  process.exit(1)
}
if (!skpmConfig.manifest) {
  console.error(
    `${chalk.red(
      'error'
    )} Missing "skpm.manifest" fields in the package.json. Should point to the "manifest.json" file`
  )
  process.exit(1)
}

const output = path.join(process.cwd(), skpmConfig.main)
const manifest = path.join(process.cwd(), skpmConfig.manifest)

if (!fs.existsSync(output)) {
  fs.mkdirSync(output)
}

if (!fs.existsSync(path.join(output, 'Contents'))) {
  fs.mkdirSync(path.join(output, 'Contents'))
}

if (!fs.existsSync(path.join(output, 'Contents', 'Sketch'))) {
  fs.mkdirSync(path.join(output, 'Contents', 'Sketch'))
}

const manifestFolder = path.dirname(manifest)

const webpackConfig = generateWebpackConfig(
  program,
  output,
  manifestFolder,
  skpmConfig
)

const defaultAppcastURL = `https://raw.githubusercontent.com/${skpmConfig.repository}/master/.appcast.xml`

function copyManifest(manifestJSON) {
  return new Promise((resolve, reject) => {
    const copy = objectAssign({}, manifestJSON)
    copy.version = manifestJSON.version || skpmConfig.version
    copy.description = manifestJSON.description || skpmConfig.description
    copy.homepage = manifestJSON.homepage || skpmConfig.homepage
    copy.name = manifestJSON.name || skpmConfig.name
    copy.disableCocoaScriptPreprocessor =
      typeof manifestJSON.disableCocoaScriptPreprocessor === 'undefined'
        ? true
        : manifestJSON.disableCocoaScriptPreprocessor

    if (manifestJSON.appcast !== false && skpmConfig.appcast !== false) {
      copy.appcast =
        manifestJSON.appcast || skpmConfig.appcast || defaultAppcastURL
    } else {
      delete copy.appcast
    }

    if (!copy.author && skpmConfig.author) {
      let { author } = skpmConfig
      if (typeof skpmConfig.author === 'string') {
        author = parseAuthor(skpmConfig.author)
      }
      copy.author = author.name
      if (!copy.email && author.email) {
        copy.email = author.email
      }
    }

    copy.commands = manifestJSON.commands.map(command => {
      const basename = path.basename(command.script)
      return objectAssign({}, command, { script: basename })
    })

    fs.writeFile(
      path.join(output, 'Contents', 'Sketch', 'manifest.json'),
      JSON.stringify(copy, null, 2),
      err => {
        if (err) {
          reject(new Error(`Error while writing the manifest: ${err.message}`))
          return
        }
        resolve()
      }
    )
  })
}

let counter = 0

function getCommands(manifestJSON) {
  const commandsAndHandlers = manifestJSON.commands.reduce((prev, c) => {
    if (!prev[c.script]) {
      prev[c.script] = {
        script: c.script,
        handlers: [],
        identifiers: [],
      }
    }
    if (c.handler) {
      prev[c.script].handlers.push(c.handler)
    } else if (c.handlers) {
      if (Array.isArray(c.handlers)) {
        c.handlers.forEach(h => {
          prev[c.script].handlers.push(h)
        })
      } else if (c.handlers.actions) {
        Object.keys(c.handlers.actions).forEach(k => {
          prev[c.script].handlers.push(c.handlers.actions[k])
        })
      } else {
        console.log(
          `${chalk.red(
            'error'
          )} Not sure what to do with the ${c.identifier} handlers`
        )
        process.exit(1)
      }
    }

    // always expose the default
    if (prev[c.script].handlers.indexOf('onRun') === -1) {
      prev[c.script].handlers.push('onRun')
    }
    if (c.identifier) {
      prev[c.script].identifiers.push(c.identifier)
    }
    return prev
  }, {})

  return Object.keys(commandsAndHandlers).map(k => commandsAndHandlers[k])
}

function getResources(_skpmConfig) {
  const resourcesArrays = _skpmConfig.resources.map(resource =>
    glob.sync(resource)
  )
  return resourcesArrays.reduce((prev, a) => prev.concat(a || []), [])
}

let steps
function checkEnd() {
  counter += 1
  if (counter >= steps) {
    console.log(`${chalk.green('success')} Plugin built`)
    process.exit(0)
  }
}

function buildCallback(file, watching) {
  return (err, stats) => {
    if (err) {
      console.error(`${chalk.red('error')} Error while building ${file}`)
      console.error(err.stack || err)
      if (err.details) {
        console.error(err.details)
      }
      process.exit(1)
    }

    const info = stats.toJson({
      chunks: false,
      colors: true,
      modules: false,
      assets: false,
      performance: false,
      reasons: false,
      version: false,
    })

    if (stats.hasErrors()) {
      console.error(`${chalk.red('error')} Error while building ${file}`)
      ;(info.errors || []).forEach(error => {
        console.error(error)
      })
      if (!watching) {
        process.exit(1)
      }
    } else {
      if (stats.hasWarnings() && !program.quiet) {
        ;(info.warnings || []).forEach(warning => {
          console.warn(warning)
        })
      }
      console.log(
        `${watching
          ? ''
          : chalk.dim(
              `[${counter + 1}/${steps}] `
            )}${randomBuildEmoji()}  Built ${chalk.blue(file)} in ${chalk.grey(
          info.time
        )}ms`
      )
      if (!watching) {
        checkEnd()
      }
    }
  }
}

function buildAndWatchCommandsAndResources(commands, resources) {
  return getSketchVersion()
    .then(sketchVersion => {
      commands.concat(resources).forEach(command => {
        const file = command.script || command
        const compiler = webpack(
          webpackConfig(
            file,
            command.identifiers,
            command.handlers,
            sketchVersion
          )
        )
        if (program.watch) {
          compiler.watch({}, buildCallback(file, program.watch))
        } else {
          compiler.run(buildCallback(file, program.watch))
        }
      })
    })
    .catch(err => {
      console.error(`${chalk.red('error')} Error while building`)
      console.error(err)
      if (!program.watch) {
        process.exit(1)
      }
    })
}

function buildPlugin() {
  let manifestJSON
  try {
    // delete the require cache so that we can require it anew (when watching)
    delete require.cache[manifest]
    manifestJSON = require(manifest)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }

  const commands = getCommands(manifestJSON)
  const resources = getResources(skpmConfig)
  steps = commands.length + resources.length + 1

  const now = Date.now()

  // start by copying the manifest
  return copyManifest(manifestJSON)
    .then(() => {
      if (!program.watch) {
        console.log(
          `${chalk.dim(`[${counter + 1}/${steps}]`)} 🖨  Copied ${chalk.blue(
            skpmConfig.manifest
          )} in ${chalk.grey(Date.now() - now)}ms`
        )
        checkEnd()
      } else {
        console.log(
          `🖨  Copied ${chalk.blue(skpmConfig.manifest)} in ${chalk.grey(
            Date.now() - now
          )}ms`
        )
      }

      // and then, build the commands
      return buildAndWatchCommandsAndResources(commands, resources)
    })
    .catch(err => {
      console.error(
        `${chalk.red('error')} Error while copying ${skpmConfig.manifest}`
      )
      console.error(err)
      if (!program.watch) {
        process.exit(1)
      }
    })
}

function buildAndWatchPlugin() {
  let compilers
  buildPlugin().then(_compilers => {
    compilers = _compilers
  })

  if (program.watch) {
    fs.watch(manifest, () =>
      // manifest has changed, we need to rebuild the plugin entirely

      Promise.resolve()
        .then(() => {
          if (!compilers) {
            return []
          }
          // if we are watching the commands, close the watchers first
          return Promise.all(
            compilers.map(
              c =>
                new Promise(resolve => {
                  if (c) {
                    c.close(resolve)
                  } else {
                    resolve()
                  }
                })
            )
          )
        })
        .then(() =>
          buildPlugin().then(_compilers => {
            compilers = _compilers
          })
        )
    )
  }
}

buildAndWatchPlugin()

#!/usr/bin/env node
import fs from 'fs'
import mkdirp from 'mkdirp'
import path from 'path'
import webpack from 'webpack'
import yargs from 'yargs'
import parseAuthor from 'parse-author'
import chalk from 'chalk'
import globby from 'globby'
import { exec } from 'child_process'
import getSkpmConfigFromPackageJSON from '@skpm/internal-utils/skpm-config'
import replaceArraysByLastItem from '@skpm/internal-utils/replace-arrays-by-last-item'
import generateWebpackConfig from './utils/webpackConfig'

const buildEmojis = ['🔧', '🔨', '⚒', '🛠', '⛏', '🔩']
function randomBuildEmoji() {
  return buildEmojis[Math.floor(Math.random() * buildEmojis.length)]
}

const { argv } = yargs
  .scriptName('skpm-build')
  .option('watch', {
    alias: 'w',
    describe: 'Watch and rebuild automatically',
    type: 'boolean',
  })
  .option('quiet', {
    alias: 'q',
    describe: 'Hide compilation warnings',
    type: 'boolean',
  })
  .option('run', {
    alias: 'r',
    describe: 'Run plugin after compiling',
    type: 'boolean',
  })
  .option('app', {
    describe:
      "The path to the copy of Sketch to run the plugin after compiling. If this isn't supplied, we try to run the latest Xcode build. If there is none, we try to find a normal Sketch.",
    type: 'string',
  })
  .option('manifest', {
    describe:
      'The path to another manifest. Use this option if you need to build different version of your plugin.',
    type: 'string',
  })
  .option('output', {
    describe:
      'The path to the final plugin. Use this option if you need to build different version of your plugin.',
    type: 'string',
  })
  .help()
  .strict()

replaceArraysByLastItem(argv, [
  'watch',
  'quiet',
  'run',
  'app',
  'manifest',
  'output',
])

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

const skpmConfig = getSkpmConfigFromPackageJSON(packageJSON, argv)

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

if (!fs.existsSync(path.join(output, 'Contents', 'Sketch'))) {
  mkdirp.sync(path.join(output, 'Contents', 'Sketch'))
}

const manifestFolder = path.dirname(manifest)

const appcastURL = appcast => {
  if (/^http/.test(appcast)) {
    return appcast
  }
  return `https://raw.githubusercontent.com/${
    skpmConfig.repository
  }/master/${appcast.replace(/^\.\//g, '')}`
}

async function copyManifest(manifestJSON) {
  return new Promise((resolve, reject) => {
    const copy = { ...manifestJSON }
    copy.version = manifestJSON.version || skpmConfig.version
    copy.description = manifestJSON.description || skpmConfig.description
    copy.homepage = manifestJSON.homepage || skpmConfig.homepage
    copy.name = manifestJSON.name || skpmConfig.name
    copy.identifier = manifestJSON.identifier || skpmConfig.identifier
    copy.disableCocoaScriptPreprocessor =
      typeof manifestJSON.disableCocoaScriptPreprocessor === 'undefined'
        ? true
        : manifestJSON.disableCocoaScriptPreprocessor

    if (manifestJSON.appcast !== false && skpmConfig.appcast !== false) {
      copy.appcast =
        manifestJSON.appcast || appcastURL(skpmConfig.appcast || '.appcast.xml')
    } else {
      delete copy.appcast
    }

    if (!copy.author && skpmConfig.author) {
      let { author } = skpmConfig
      if (typeof skpmConfig.author === 'string') {
        author = parseAuthor(skpmConfig.author)
      }
      copy.author = author.name
      if (!copy.authorEmail && author.email) {
        copy.authorEmail = author.email
      }
    }

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
        isPluginCommand: true,
        absolutePath: path.join(manifestFolder, c.script),
        script: c.script,
        handlers: [],
        identifiers: [],
      }
    }
    if (c.handler) {
      prev[c.script].handlers.push(c.handler)
    } else if (c.handlers) {
      // eslint-disable-next-line no-inner-declarations
      function getHandlers(handlers) {
        if (typeof handlers === 'string') {
          prev[c.script].handlers.push(handlers)
        } else if (Array.isArray(c.handlers)) {
          c.handlers.forEach(h => {
            prev[c.script].handlers.push(h)
          })
        } else {
          Object.keys(handlers).forEach(k => getHandlers(handlers[k]))
        }
      }
      getHandlers(c.handlers)
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

async function getResources(_skpmConfig) {
  if (!_skpmConfig.resources || !_skpmConfig.resources.length) {
    return []
  }

  const resources = await globby(_skpmConfig.resources)
  return resources
}

async function getAssets(_skpmConfig) {
  if (!_skpmConfig.assets || !_skpmConfig.assets.length) {
    return []
  }

  const assets = await globby(_skpmConfig.assets, { dot: true })
  return assets
}

let steps
function checkEnd() {
  counter += 1
  if (counter >= steps) {
    console.log(`${chalk.green('success')} Plugin built`)
    process.exit(0)
  }
}

async function copyAsset(asset) {
  const dirWithoutFirst = asset
    .split(path.sep)
    .splice(1)
    .join(path.sep)

  const destPath = path.join(output, 'Contents', 'Resources', dirWithoutFirst)

  await new Promise((resolve, reject) => {
    mkdirp(path.dirname(destPath), err => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })

  return new Promise((resolve, reject) => {
    const callback = err => {
      if (err) {
        reject(err)
        return
      }
      resolve()
    }
    if (fs.copyFile) {
      fs.copyFile(asset, destPath, callback)
    } else {
      exec(`cp "${asset}" "${destPath}"`, callback)
    }
  })
    .then(() => {
      console.log(
        `${
          argv.watch ? '' : chalk.dim(`[${counter + 1}/${steps}] `)
        }${randomBuildEmoji()}  Copied ${chalk.blue(asset)}`
      )
      if (!argv.watch) {
        checkEnd()
      }
    })
    .catch(err => {
      console.error(`${chalk.red('error')} Error while copying ${asset}`)
      console.error(err.stack || err)
      if (err.details) {
        console.error(err.details)
      }
      process.exit(1)
    })
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
      if (stats.hasWarnings() && !argv.quiet) {
        ;(info.warnings || []).forEach(warning => {
          console.warn(warning)
        })
      }
      console.log(
        `${
          watching ? '' : chalk.dim(`[${counter + 1}/${steps}] `)
        }${randomBuildEmoji()}  Built ${chalk.blue(file)} in ${chalk.grey(
          info.time
        )}ms`
      )
      if (!watching) {
        checkEnd()
      }
    }
  }
}

async function buildCommandsAndResources(commands, resources, watch) {
  const webpackConfig = await generateWebpackConfig(
    argv,
    output,
    manifestFolder,
    skpmConfig
  )

  const compilers = []
  const entries = commands.concat(
    (resources || []).map(resource => ({
      isPluginCommand: false,
      script: resource,
      absolutePath: path.join(process.cwd(), resource),
    }))
  )

  // eslint-disable-next-line no-restricted-syntax
  for (const entry of entries) {
    const compiler = webpack(await webpackConfig(entry))
    if (watch) {
      // https://github.com/webpack/webpack.js.org/issues/125
      // watchOptions need to be manually passed to the watch() method.
      compilers.push(
        compiler.watch(
          compiler.options.watchOptions,
          buildCallback(entry.script, watch)
        )
      )
    } else {
      compiler.run(buildCallback(entry.script))
    }
  }

  return compilers
}

async function buildPlugin() {
  let manifestJSON
  try {
    // delete the require cache so that we can require it anew (when watching)
    delete require.cache[manifest]
    manifestJSON = require(manifest)

    // set the identifier because we need it to reload the plugin
    skpmConfig.identifier =
      manifestJSON.identifier || skpmConfig.identifier || skpmConfig.name
  } catch (err) {
    console.error(err)
    process.exit(1)
  }

  const commands = getCommands(manifestJSON)
  const resources = await getResources(skpmConfig)
  const assets = await getAssets(skpmConfig)
  steps = commands.length + resources.length + assets.length + 1

  const now = Date.now()

  // start by copying the manifest
  try {
    await copyManifest(manifestJSON)
    if (!argv.watch) {
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
  } catch (err) {
    console.error(
      `${chalk.red('error')} Error while copying ${skpmConfig.manifest}`
    )
    console.error(err)
    if (!argv.watch) {
      process.exit(1)
    }
  }

  // then copy the assets
  // we do not watch them because we would need to spin a new chokidar instance and that's expensive
  // if you add a new asset, just restart the build
  await Promise.all(assets.map(copyAsset))

  // and then, build the commands
  return buildCommandsAndResources(commands, resources, argv.watch)
}

async function buildAndWatchPlugin() {
  let compilers = await buildPlugin()

  if (argv.watch) {
    fs.watch(manifest, async () => {
      // manifest has changed, we need to rebuild the plugin entirely

      if (compilers && compilers.length) {
        // if we are watching the commands, close the watchers first
        await Promise.all(
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
      }

      compilers = await buildPlugin()
    })
  }
}

try {
  buildAndWatchPlugin()
} catch (err) {
  console.error(`${chalk.red('error')} Error while building the plugin`)
  console.error(err)
  process.exit(1)
}

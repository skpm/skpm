#!/usr/bin/env node
import fs from 'fs'
import { mkdirp } from 'mkdirp'
import { join, basename } from 'path'
import yargs from 'yargs'
import chalk from 'chalk'
import semver from 'semver'
import { get as getConfig } from '@skpm/internal-utils/tool-config'
import getSkpmConfigFromPackageJSON from '@skpm/internal-utils/skpm-config'
import getSketchVersion from '@skpm/internal-utils/getSketchVersion'
import checkDevMode from '@skpm/internal-utils/check-dev-mode'

// Linking makes no sense when running on a CI, so let's do nothing here
if (process.env.CI) {
  process.exit(0)
}

const { pluginDirectory } = getConfig()

const { argv } = yargs
  .scriptName('skpm-link')
  .help()
  .strict()
  .usage('Usage: cd path/to/my/plugin && skpm-link')
  .option('output', {
    describe:
      'The path to the final plugin. Use this option if you need to link specific version of your plugin.',
    type: 'string',
  })
  .help()
  .strict()

const path = argv.$1 || '.'

if (path.indexOf(pluginDirectory) !== -1) {
  console.error(
    `${chalk.red(
      'error'
    )} The path should be the one pointing to your new plugin folder, not the sketch plugins folder`
  )
  process.exit(1)
}

function getPath(file) {
  return path[0] === '/'
    ? join(path, file) // absolute path
    : join(process.cwd(), path, file) // relative path
}

let packageJSON
try {
  packageJSON = require(getPath('package.json'))
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

if (!skpmConfig.name) {
  console.error(
    `${chalk.red('error')} Missing "name" field in the package.json.`
  )
  process.exit(1)
}

console.log(
  `${chalk.dim('[1/1]')} 🔗  Symlinking the plugin ${skpmConfig.name}...`
)

try {
  // Create the encompassing directory if it doesn't already exist
  if (!fs.existsSync(join(pluginDirectory, skpmConfig.name))) {
    mkdirp.sync(join(pluginDirectory, skpmConfig.name))
  }

  const symlinkPath = join(
    pluginDirectory,
    skpmConfig.name,
    basename(skpmConfig.main)
  )
  // Show an error if this symlink already exists
  if (fs.existsSync(symlinkPath)) {
    console.log(
      `${chalk.yellow('warning')} This plugin has already been linked.`
    )
    process.exit(0)
  }

  // Create the symlink within the encompassing directory
  fs.symlinkSync(getPath(skpmConfig.main), symlinkPath)

  console.log(`${chalk.green('success')} Plugin ${skpmConfig.name} symlinked`)
  console.log(
    `${chalk.blue(skpmConfig.name)} - ${chalk.grey(skpmConfig.version)}`
  )

  checkDevMode()
    .then(() => getSketchVersion())
    .then(sketchVersion => {
      if (sketchVersion && semver.gte(sketchVersion, '45.0.0')) {
        console.log()
        console.log(
          `${chalk.yellow(
            'warning'
          )} Starting with Sketch 45, you may need to restart Sketch for your plugin to appear in the "Plugins" menu`
        )
        console.log()
      }
      process.exit(0)
    })
} catch (err) {
  console.log(
    `${chalk.red('error')} Error while symlinking the plugin ${skpmConfig.name}`
  )
  console.log((err || {}).body || err)
  process.exit(1)
}

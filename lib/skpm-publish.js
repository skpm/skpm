#!/usr/bin/env node
const path = require('path')
const fs = require('fs')
const program = require('commander')
const chalk = require('chalk')
const xml2js = require('xml2js')
const open = require('open')
const { exec } = require('./utils/exec')
const auth = require('./utils/auth')
const github = require('./utils/github')
const getSkpmConfigFromPackageJSON = require('./utils/getSkpmConfigFromPackageJSON')
const extractRepository = require('./utils/extractRepository')

const EMPTY_APPCAST = {
  rss: {
    $: {
      'xmlns:sparkle': 'http://www.andymatuschak.org/xml-namespaces/sparkle',
      'xmlns:dc': 'http://purl.org/dc/elements/1.1/',
      version: '2.0',
    },
    channel: [{ item: [] }],
  },
}

program
  .description('Publish a new version of the plugin')
  .usage('[options] <bump>')
  .option('-o, --open-release', 'Open the newly created release on Github.com')
  .option('-n, --no-registry', 'Do not push to the registry')
  .option(
    '-u, --repo-url <repoURL>',
    'Specify the repository URL (default to the one specified in package.json)'
  )
  .arguments('<bump>')
  .action(bump => {
    program.bump = bump
  })
  .parse(process.argv)

let token

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

if (!skpmConfig.name) {
  console.error(
    `${chalk.red('error')} Missing "name" field in the package.json.`
  )
  process.exit(1)
}

const repo =
  (program.repoUrl && extractRepository(program.repoUrl)) ||
  skpmConfig.repository

if (!repo) {
  console.error(
    `${chalk.red('error')} Missing "repository" field in the package.json.`
  )
  process.exit(1)
}

let script = (packageJSON.scripts || {}).prepublish && 'prepublish'
if (!script) {
  script = (packageJSON.scripts || {}).build && 'build'
}

const tempZip = `${Date.now()}.zip`
let tag
let releaseId

let step = 0
let steps = 8
if (script) {
  steps += 1
}
if (program.registry !== false && !packageJSON.private) {
  steps += 1
}
if (typeof program.bump === 'undefined') {
  steps -= 3
  tag = skpmConfig.version
}

step += 1
console.log(
  `${chalk.dim(
    `[${step}/${steps}]`
  )} 🗝  Checking if \`${repo}\` is accessible...`
)

auth
  .getToken()
  .then(_token => {
    token = _token
    return github.getRepo(token, repo)
  })
  .catch(err => {
    console.error(
      `${chalk.red(
        'error'
      )} The repository doesn't exist or the GitHub token is invalid`
    )
    console.error(err)
    process.exit(1)
  })
  .then(() => {
    if (typeof program.bump === 'undefined') {
      return undefined
    }
    step += 1
    console.log(
      `${chalk.dim(
        `[${step}/${steps}]`
      )} 🏷  Bumping package.json version and creating git tag...`
    )
    return exec(`npm version ${program.bump} -m "Publish %s release :rocket:"`)
  })
  .then(res => {
    if (typeof program.bump === 'undefined') {
      return undefined
    }
    step += 1
    console.log(
      `${chalk.dim(`[${step}/${steps}]`)} 🗂  Updating the appcast file...`
    )
    tag = res.stdout.trim()
    const appcast = path.join(process.cwd(), '.appcast.xml')
    return new Promise(resolve => {
      fs.readFile(appcast, (err, data) => {
        if (err) {
          return resolve(EMPTY_APPCAST)
        }
        return xml2js.parseString(data, (parseErr, result) => {
          if (parseErr) {
            return resolve(EMPTY_APPCAST)
          }
          return resolve(result)
        })
      })
    })
      .then(appcastObj => {
        appcastObj.rss.channel[0].item.unshift({
          enclosure: [
            {
              $: {
                url: `https://github.com/${repo}/releases/download/${tag}/${path.basename(
                  skpmConfig.main
                )}.zip`,
                'sparkle:version': tag.replace('v', ''),
              },
            },
          ],
        })
        const builder = new xml2js.Builder()
        return builder.buildObject(appcastObj)
      })
      .then(
        xml =>
          new Promise((resolve, reject) => {
            fs.writeFile(appcast, xml, (err, data) => {
              if (err) {
                return reject(err)
              }
              return resolve(data)
            })
          })
      )
      .then(() => exec(`git add "${appcast}"`))
      .then(() =>
        exec('git commit -m "Update .appcast with new tag :sparkles:"')
      )
  })
  .then(() => {
    if (typeof program.bump === 'undefined') {
      return undefined
    }
    step += 1
    console.log(
      `${chalk.dim(
        `[${step}/${steps}]`
      )} 📤  Pushing the created tag to Github...`
    )
    return exec(`git push -f origin HEAD ${tag}`)
  })
  .then(() => {
    if (!script) {
      return undefined
    }
    step += 1
    console.log(`${chalk.dim(`[${step}/${steps}]`)} 🛠  Building the plugin...`)
    return exec(`npm run ${script}`)
  })
  .then(() => {
    step += 1
    console.log(`${chalk.dim(`[${step}/${steps}]`)} 📦  Zipping the plugin...`)
    return exec(`zip -r ${tempZip} '${skpmConfig.main}' -x '*.DS_Store'`)
  })
  .then(() => {
    step += 1
    console.log(
      `${chalk.dim(
        `[${step}/${steps}]`
      )} 📝  Creating a draft release on Github...`
    )
    return github.createDraftRelease(token, repo, tag)
  })
  .then(res => {
    releaseId = res.id
    step += 1
    console.log(`${chalk.dim(`[${step}/${steps}]`)} 🚀  Uploading zip asset...`)
    return github.updateAsset(
      token,
      repo,
      releaseId,
      tempZip,
      `${path.basename(skpmConfig.main)}.zip`
    )
  })
  .then(() => {
    step += 1
    console.log(
      `${chalk.dim(`[${step}/${steps}]`)} 🎉  Publishing the release...`
    )
    return github.publishRelease(token, repo, releaseId)
  })
  .then(() => {
    step += 1
    console.log(
      `${chalk.dim(`[${step}/${steps}]`)} 🗑  Removing the temporary zip zip...`
    )
    return exec(`rm -f ${tempZip}`)
  })
  .then(() => {
    if (program.registry !== false && !packageJSON.private) {
      step += 1
      console.log(
        `${chalk.dim(
          `[${step}/${steps}]`
        )} 🔔  Publishing the plugin on the official plugin directory...`
      )
      return github.addPluginToPluginsRegistryRepo(token, packageJSON, repo)
    }
    return undefined
  })
  .then(() => {
    console.log(`${chalk.green('success')} Plugin published`)
    console.log(`${skpmConfig.name}@${tag.replace('v', '')}`)
    if (program.openRelease) {
      open(`https://github.com/${repo}/tag/${tag.replace('v', '')}`)
    }
    process.exit(0)
  })
  .catch(err => {
    console.error(`${chalk.red('error')} Publication failed`)
    console.error(err)
    process.exit(1)
  })

import Ora from 'ora'
import path from 'path'
import fs from 'fs'
import xml2js from 'xml2js'
import open from 'opn'
import { prompt } from 'inquirer'
import { exec } from '@skpm/internal-utils/exec'
import getSkpmConfigFromPackageJSON from '@skpm/internal-utils/skpm-config'
import extractRepository from '@skpm/internal-utils/extract-repository'
import replaceArraysByLastItem from '@skpm/internal-utils/replace-arrays-by-last-item'
import toolConfig from '@skpm/internal-utils/tool-config'
import auth from '../utils/auth'
import github from '../utils/github'
import asyncCommand from '../utils/async-command'
import { error } from '../utils'

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

let CACHED_TOKEN
async function getToken(repo) {
  if (CACHED_TOKEN) {
    return CACHED_TOKEN
  }
  try {
    const token = await auth.getToken()
    await github.getRepo(token, repo)
    CACHED_TOKEN = token
    return token
  } catch (e) {
    error(`The repository doesn't exist or the GitHub token is invalid`)
    throw e
  }
}

export default asyncCommand({
  command: 'publish <bump>',

  desc:
    'Publish a new version of the plugin. <bump> can be the new version number or any of the following: major, minor, patch, premajor preminor, prepatch, prerelease.',

  builder: {
    'repo-url': {
      description:
        'Specify the repository URL (default to the one specified in package.json).',
      type: 'string',
    },
    'skip-release': {
      description: 'Do not create a release on GitHub.com.',
      type: 'boolean',
      // conflicts: 'open-release', // TODO un-comment when https://github.com/yargs/yargs/issues/929 is fixed
      implies: 'download-url',
    },
    'open-release': {
      description: 'Open the newly created release on GitHub.com.',
      type: 'boolean',
      alias: 'o',
    },
    'skip-registry': {
      description:
        'Do not publish to the plugins registry if not already present.',
      type: 'boolean',
    },
    'download-url': {
      description:
        "Specify the new version's download URL (default to the asset of the release created on GitHub.com).",
      type: 'string',
    },
    appcast: {
      description:
        'Specify the local path to the appcast (default to .appcast.xml). If `false`, then the appcast update will be skipped',
      type: 'string',
    },
  },

  async handler(argv) {
    replaceArraysByLastItem(argv, [
      'repoUrl',
      'skipRelease',
      'openRelease',
      'skipRegistry',
      'downloadUrl',
      'appcast',
    ])

    let packageJSON
    try {
      packageJSON = require(path.join(process.cwd(), 'package.json'))
    } catch (err) {
      error(`Error while reading the package.json file`)
      throw err
    }

    const skpmConfig = getSkpmConfigFromPackageJSON(packageJSON)

    const repo =
      (argv.repoUrl && extractRepository(argv.repoUrl)) || skpmConfig.repository

    if (!repo) {
      throw new Error(
        'Please supply github.com repo URL as --repo-url or in "repository" field in the package.json.'
      )
    }

    if (!argv.skipRegistry && !skpmConfig.description) {
      const manifest = path.join(process.cwd(), skpmConfig.manifest)
      let manifestJSON
      try {
        manifestJSON = require(manifest)
      } catch (err) {
        // ignore
      }
      if (!manifestJSON || !manifestJSON.description) {
        throw new Error('Missing "description" field in the package.json.')
      }
    }

    let token

    if (!argv.skipRelease || !argv.skipRegistry) {
      token = await getToken(repo)
    }

    let tag = skpmConfig.version

    let spinner = null

    function print(text, action) {
      if (process.env.CI) {
        console.log(text)
      } else if (spinner) {
        if (action) {
          spinner[action](text)
        } else {
          spinner.text = text
          if (!spinner.isSpinning) {
            spinner.start()
          }
        }
      } else {
        spinner = new Ora({
          text,
          color: 'magenta',
        }).start()
      }
    }

    print(`Checking if \`${repo}\` is accessible`)

    if (argv.bump) {
      print('Bumping package.json version and creating git tag')
      const { stdout } = await exec(
        `npm version ${
          argv.bump
        } -m "Publish %s release :rocket:" --allow-same-version`
      )
      tag = stdout.trim()
      if (!tag.startsWith('v')) {
        tag = `v${tag}`
      }
    }

    if (argv.appcast !== 'false') {
      print('Updating the appcast file')

      const appcast = path.join(
        process.cwd(),
        (argv.appcast || skpmConfig.appcast || '.appcast.xml').replace(
          /^\.\//g,
          ''
        )
      )
      const appcastObj = await new Promise(resolve => {
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

      appcastObj.rss.channel[0].item.unshift({
        enclosure: [
          {
            $: {
              url:
                argv.downloadUrl ||
                `https://github.com/${repo}/releases/download/${tag}/${path
                  .basename(skpmConfig.main)
                  .replace(/ /g, '.')}.zip`,
              'sparkle:version': tag.replace('v', ''),
            },
          },
        ],
      })
      const builder = new xml2js.Builder()
      const xml = await builder.buildObject(appcastObj)

      fs.writeFileSync(appcast, xml)

      await exec(`git add "${appcast}"`)
      await exec('git commit -m "Update .appcast with new tag :sparkles:"')
    }

    print('Pushing the changes to Github')

    await exec(`git push origin HEAD`)

    if (argv.bump) {
      await exec(`git push -f origin HEAD ${tag}`)
    }

    if (!argv.skipRelease) {
      let script = (packageJSON.scripts || {}).prepublish && 'prepublish'
      if (!script) {
        script = (packageJSON.scripts || {}).prepare && 'prepare'
      }
      if (!script) {
        script = (packageJSON.scripts || {}).build && 'build'
      }

      if (script) {
        print('Building the plugin')
        await exec(`NODE_ENV=production npm run ${script}`)
      }

      print('Zipping the plugin')
      const tempZip = `${Date.now()}.zip`
      await exec(
        `zip --symlinks -r ${tempZip} '${skpmConfig.main}' -x '*.DS_Store'`,
        {
          maxBuffer: 2000 * 1024,
        }
      )

      // eslint-disable-next-line prefer-const
      let { notarisation, notarization } = toolConfig.get()
      if (!notarization) {
        // suport both spelling
        notarization = notarisation
      }
      if (notarization) {
        if (notarization.command) {
          print('Running custom notarization command')
          await exec(`${notarization.command} ${tempZip}`)
        } else {
          print('Preparing the plugin to be notarized')
          await exec(
            `codesign -f -s "${
              notarization.authority
            }" --timestamp --identifier "${skpmConfig.identifer}" ${tempZip}`
          )

          print('Sending the plugin to be notarized')
          let requestId
          try {
            const { stderr } = await exec(
              `xcrun altool --notarize-app -f ${tempZip} --primary-bundle-id "${
                skpmConfig.identifer
              }" -u "${notarization.username}" -p "${notarization.password}"`
            )
            ;[requestId] = (stderr.split('RequestUUID = ')[1] || '').split('\n')

            if (!requestId) {
              throw new Error(stderr)
            }
          } catch (err) {
            if (err.message.indexOf('already been uploaded') !== -1) {
              // we can handle that
              ;[requestId] = (
                err.message.split('The upload ID is ')[1] || ''
              ).split('"')

              if (!requestId) {
                throw err
              }
            } else {
              throw err
            }
          }

          console.log(
            `\n\nPlugin sent to the notarization server. To check the status of the request (which might take a few minutes), run:\nxcrun altool --notarization-info ${requestId.trim()} -u "${
              notarization.username
            }" -p "${notarization.password}"\n\n`
          )
        }
      } else {
        console.warn(
          `\n\n⚠️ The plugin won't be notarized because the configuration is missing. It is a requirement if the plugin contains a native obj-c framework or bundled binaries on macOS 10.15. If you don't use any of those (or don't know what it is, please ignore thise warning).\nFor more information about how to set up the notarization process and what it means, check https://developer.sketch.com/plugins/notarize-plugins.\n\n`
        )
      }

      print('Creating a draft release on GitHub')
      const { id: releaseId } = await github.createDraftRelease(
        token,
        repo,
        tag
      )

      print('Uploading zip asset')
      await github.updateAsset(
        token,
        repo,
        releaseId,
        tempZip,
        `${path.basename(skpmConfig.main)}.zip`
      )

      print('Publishing the release')
      await github.publishRelease(token, repo, releaseId)

      print('Removing the temporary zip')
      await exec(`rm -f ${tempZip}`)
    }

    if (
      !argv.skipRegistry &&
      (!packageJSON.skpm || !packageJSON.skpm.private)
    ) {
      print('Checking if the plugin is on the official plugin directory')
      const upstreamPluginJSON = await github.getRegistryRepo(
        token,
        skpmConfig,
        repo
      )
      if (!upstreamPluginJSON.existingPlugin) {
        if (spinner) spinner.stop()
        const { addToRegistry } = await prompt({
          type: 'confirm',
          name: 'addToRegistry',
          message: `The plugin is not on the plugins registry yet. Do you wish to add it?`,
          default: true,
        })
        if (addToRegistry) {
          print('Publishing the plugin on the official plugin directory')
          await github.addPluginToPluginsRegistryRepo(
            token,
            skpmConfig,
            repo,
            upstreamPluginJSON
          )
        }
      }
    }

    print('Plugin published!', 'succeed')
    console.log(`${skpmConfig.name}@${tag.replace('v', '')}`)

    if (argv.openRelease) {
      open(`https://github.com/${repo}/releases/tag/${tag}`)
    }
  },
})

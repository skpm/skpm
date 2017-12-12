import ora from 'ora'
import path from 'path'
import fs from 'fs'
import xml2js from 'xml2js'
import open from 'open'
import { exec } from '@skpm/utils/exec'
import getSkpmConfigFromPackageJSON from '@skpm/utils/skpm-config'
import extractRepository from '@skpm/utils/extract-repository'
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

  desc: 'Publish a new version of the plugin.',

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
  },

  async handler(argv) {
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
      throw new Error('Missing "repository" field in the package.json.')
    }

    if (!argv.skipRegistry && !skpmConfig.description) {
      throw new Error('Missing "description" field in the package.json.')
    }

    let token

    if (!argv.skipRelease || !argv.skipRegistry) {
      token = await getToken(repo)
    }

    let tag = skpmConfig.version

    const spinner = ora({
      text: `Checking if \`${repo}\` is accessible`,
      color: 'magenta',
    }).start()

    if (argv.bump) {
      spinner.text = 'Bumping package.json version and creating git tag'
      const { stdout } = await exec(
        `npm version ${argv.bump} -m "Publish %s release :rocket:"`
      )
      tag = stdout.trim()
    }

    spinner.text = 'Updating the appcast file'

    const appcast = path.join(process.cwd(), '.appcast.xml')
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
              `https://github.com/${repo}/releases/download/${tag}/${path.basename(
                skpmConfig.main
              )}.zip`,
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

    spinner.text = 'Pushing the changes to Github'

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
        spinner.text = 'Building the plugin'
        await exec(`NODE_ENV=production npm run ${script}`)
      }

      spinner.text = 'Zipping the plugin'
      const tempZip = `${Date.now()}.zip`
      await exec(`zip -r ${tempZip} '${skpmConfig.main}' -x '*.DS_Store'`)

      spinner.text = 'Creating a draft release on GitHub'
      const { id: releaseId } = await github.createDraftRelease(
        token,
        repo,
        tag
      )

      spinner.text = 'Uploading zip asset'
      await github.updateAsset(
        token,
        repo,
        releaseId,
        tempZip,
        `${path.basename(skpmConfig.main)}.zip`
      )

      spinner.text = 'Publishing the release'
      await github.publishRelease(token, repo, releaseId)

      spinner.text = 'Removing the temporary zip'
      await exec(`rm -f ${tempZip}`)
    }

    if (!argv.skipRegistry) {
      spinner.text = 'Publishing the plugin on the official plugin directory'
      await github.addPluginToPluginsRegistryRepo(token, packageJSON, repo)
    }

    spinner.succeed('Plugin published!')
    console.log(`${skpmConfig.name}@${tag.replace('v', '')}`)

    if (argv.openRelease) {
      open(`https://github.com/${repo}/tag/${tag.replace('v', '')}`)
    }
  },
})

import ora from 'ora'
import globby from 'globby'
import gittar from 'gittar'
import fs from 'fs.promised'
import { green } from 'chalk'
import { resolve } from 'path'
import { prompt } from 'inquirer'
import checkDevMode from '@skpm/internal-utils/check-dev-mode'
import asyncCommand from '../utils/async-command'
import getGitUser from '../utils/get-git-user'
import { info, isDir, error, warn } from '../utils'
import { install, initGit, isMissing } from '../utils/setup'

const TEMPLATE = 'skpm/skpm'
const RGX = /\.(woff2?|ttf|eot|jpe?g|ico|png|gif|mp4|mov|ogg|webm)(\?.*)?$/i
const isMedia = str => RGX.test(str)

export default asyncCommand({
  command: 'create <dest>',

  desc: 'Create a new Sketch plugin.',

  builder: {
    cwd: {
      description: 'A directory to use instead of $PWD.',
      type: 'string',
      default: '.',
    },
    name: {
      description: "The plugin's name",
      type: 'string',
    },
    template: {
      description: 'The repository hosting the template to start from',
      type: 'string',
      default: 'skpm/skpm',
    },
    force: {
      description: 'Force option to create the directory for the new app',
      type: 'boolean',
      default: false,
    },
    git: {
      description: 'Initialize version control using git',
      type: 'boolean',
      default: true,
    },
    install: {
      description: 'Install dependencies',
      type: 'boolean',
      default: true,
    },
  },

  async handler(argv) {
    // Prompt if incomplete data
    if (!argv.dest) {
      warn('Insufficient command arguments! Prompting...')
      info('Alternatively, run `skpm create --help` for usage info.')

      const questions = isMissing(argv)
      const response = await prompt(questions)
      Object.assign(argv, response)
    }

    if (!argv.name) {
      argv.name = argv.dest // eslint-disable-line
    }

    const cwd = resolve(argv.cwd)
    const target = argv.dest && resolve(cwd, argv.dest)
    const exists = target && isDir(target)

    if (exists && !argv.force) {
      return error(
        'Refusing to overwrite current directory! Please specify a different destination or use the `--force` flag',
        1
      )
    }

    if (exists && argv.force) {
      const { enableForce } = await prompt({
        type: 'confirm',
        name: 'enableForce',
        message: `You are using '--force'. Do you wish to continue?`,
        default: false,
      })

      if (enableForce) {
        info('Initializing project in the current directory!')
      } else {
        return error('Refusing to overwrite current directory!', 1)
      }
    }

    const repo = argv.template || TEMPLATE

    const spinner = ora({
      text: 'Fetching the template',
      color: 'magenta',
    }).start()

    // Attempt to fetch the `template`
    const archive = await gittar.fetch(repo).catch(err => {
      spinner.fail('An error occured while fetching template.')
      return error(
        (err || {}).code === 404
          ? `Could not find repository: ${repo}`
          : (err || {}).message,
        1
      )
    })

    spinner.text = 'Extracting the template'

    // Extract files from `archive` to `target`
    // TODO: read & respond to meta/hooks
    const keeps = []
    await gittar.extract(archive, target, {
      strip: 2,
      filter(path, obj) {
        if (path.includes('/template/')) {
          obj.on('end', () => {
            if (obj.type === 'File' && !isMedia(obj.path)) {
              keeps.push(obj.absolute)
            }
          })
          return true
        }
        return false
      },
    })

    if (keeps.length) {
      // eslint-disable-next-line
      let dict = new Map()
      // TODO: concat author-driven patterns
      ;['name'].forEach(str => {
        // if value is defined
        if (argv[str] !== undefined) {
          dict.set(new RegExp(`{{\\s?${str}\\s}}`, 'g'), argv[str])
        }
      })
      // Update each file's contents
      const enc = 'utf8'
      for (const entry of keeps) {
        let buf = await fs.readFile(entry, enc)
        dict.forEach((v, k) => {
          buf = buf.replace(k, v)
        })
        await fs.writeFile(entry, buf, enc)
      }
    } else {
      return error(`No \`template\` directory found within ${repo}!`, 1)
    }

    spinner.text = 'Parsing `package.json` file'

    // Validate user's `package.json` file
    let pkgData
    const pkgFile = resolve(target, 'package.json')

    if (pkgFile) {
      pkgData = JSON.parse(await fs.readFile(pkgFile))
    } else {
      warn('Could not locate `package.json` file!')
    }

    if (pkgData && !pkgData.author) {
      const gitUser = await getGitUser()
      if (gitUser && gitUser.username && gitUser.email) {
        pkgData.author = `${gitUser.username.trim()} <${gitUser.email.trim()}>`
      }
    }

    if (argv.name) {
      // Update `package.json` key
      if (pkgData) {
        spinner.text = 'Updating `name` within `package.json` file'
        pkgData.name = argv.name.toLowerCase().replace(/\s+/g, '-')
        if (!pkgData.skpm) {
          pkgData.skpm = {}
        }
        pkgData.skpm.name = argv.name
        if (!pkgData.skpm.main || pkgData.skpm.main === 'plugin.sketchplugin') {
          pkgData.skpm.main = `${pkgData.name}.sketchplugin`
        }
      }
      // Find a `manifest.json`; use the first match, if any
      const files = await globby(`${target}/**/manifest.json`)
      const manifest = files[0] && JSON.parse(await fs.readFile(files[0]))
      if (manifest) {
        spinner.text = 'Updating `title` within `manifest.json` file'
        manifest.menu.title = argv.name
        // Write changes to `manifest.json`
        await fs.writeFile(files[0], JSON.stringify(manifest, null, 2))
      }
    }

    if (pkgData) {
      // Assume changes were made ¯\_(ツ)_/¯
      await fs.writeFile(pkgFile, JSON.stringify(pkgData, null, 2))
    }

    let shouldAskForDevMode = false

    if (argv.install) {
      spinner.text = 'Installing dependencies'
      shouldAskForDevMode = await install(target, spinner)
    }

    spinner.succeed('Done!\n')

    if (shouldAskForDevMode) {
      await checkDevMode()
    }

    if (argv.git) {
      await initGit(target)
    }

    return `${`
To get started, cd into the new directory:
  ${green(`cd ${argv.dest}`)}

To start a development live-reload build:
  ${green(`npm run start`)}

To build the plugin:
  ${green(`npm run build`)}

To publish the plugin:
  ${green('skpm publish')}
`}\n`
  },
})

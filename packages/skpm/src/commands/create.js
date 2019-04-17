import ora from 'ora'
import globby from 'globby'
import gittar from 'gittar'
import fs from 'fs.promised'
import { green } from 'chalk'
import { resolve, extname } from 'path'
import { prompt } from 'inquirer'
import jszip from 'jszip'
import checkDevMode from '@skpm/internal-utils/check-dev-mode'
import replaceArraysByLastItem from '@skpm/internal-utils/replace-arrays-by-last-item'
import asyncCommand from '../utils/async-command'
import getGitUser from '../utils/get-git-user'
import { info, isDir, error, warn } from '../utils'
import { install, initGit, isMissing } from '../utils/setup'

const TEMPLATE = 'skpm/skpm'
const RGX = /\.(woff2?|ttf|eot|jpe?g|ico|png|gif|mp4|mov|ogg|webm)(\?.*)?$/i
const isMedia = str => RGX.test(str)

function buildStubs(argv) {
  const stubs = new Map()
  ;['name', 'slug'].forEach(str => {
    // if value is defined
    if (argv[str] !== undefined) {
      stubs.set(new RegExp(`{{\\s?${str}\\s}}`, 'g'), argv[str])
    }
  })
  return stubs
}

function replaceStubs(stubs, string) {
  let result = string
  stubs.forEach((v, k) => {
    result = result.replace(k, v)
  })
  return result
}

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
    replaceArraysByLastItem(argv, [
      'cwd',
      'name',
      'template',
      'force',
      'git',
      'install',
    ])

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

    if (!argv.name) {
      return error('Need to specify a destination', 1)
    }

    argv.slug = argv.name.toLowerCase().replace(/\s+/g, '-') // eslint-disable-line

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

    function print(text) {
      if (process.env.CI) {
        console.log(text)
      } else {
        spinner.text = text
      }
    }

    print('Fetching the template')

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

    print('Extracting the template')

    // Extract files from `archive` to `target`
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

    if (!keeps.length) {
      return error(`No \`template\` directory found within ${repo}!`, 1)
    }
    const stubs = buildStubs(argv)

    // Update each file's contents
    const enc = 'utf8'
    // eslint-disable-next-line no-restricted-syntax
    for (const entry of keeps) {
      if (extname(entry) === '.sketch') {
        const data = await fs.readFile(entry)
        const zip = await jszip.loadAsync(data)
        const promises = []
        // replace in all the pages
        zip.folder('pages').forEach(relativePath => {
          promises.push(async () => {
            const pagePath = `pages/${relativePath}`
            let buf = await zip.file(pagePath).async('string')
            buf = replaceStubs(stubs, buf)
            zip.file(pagePath, buf)
          })
        })
        await Promise.all(promises.map(x => x()))
        await new Promise((resolvePromise, reject) => {
          zip
            .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
            .pipe(fs.createWriteStream(entry))
            .on('finish', () => {
              // JSZip generates a readable stream with a "end" event,
              // but is piped here in a writable stream which emits a "finish" event.
              resolvePromise()
            })
            .on('error', reject)
        })
      } else {
        let buf = await fs.readFile(entry, enc)
        buf = replaceStubs(stubs, buf)
        await fs.writeFile(entry, buf, enc)
      }
    }

    print('Parsing `package.json` file')

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

    // Update `package.json` key
    if (pkgData) {
      print('Updating `name` within `package.json` file')
      pkgData.name = argv.slug
      if (!pkgData.skpm) {
        pkgData.skpm = {}
      }
      pkgData.skpm.name = argv.name
      if (!pkgData.skpm.main || pkgData.skpm.main === 'plugin.sketchplugin') {
        pkgData.skpm.main = `${argv.slug}.sketchplugin`
      }
    }
    // Find a `manifest.json`; use the first match, if any
    const files = await globby(`${target}/**/manifest.json`)
    const manifest = files[0] && JSON.parse(await fs.readFile(files[0]))
    if (manifest && manifest.menu) {
      print('Updating `title` within `manifest.json` file')
      manifest.menu.title = argv.name
      // Write changes to `manifest.json`
      await fs.writeFile(files[0], JSON.stringify(manifest, null, 2))
    }

    if (pkgData) {
      // Assume changes were made ¯\_(ツ)_/¯
      await fs.writeFile(pkgFile, JSON.stringify(pkgData, null, 2))
    }

    let shouldAskForDevMode = false

    if (argv.install) {
      print('Installing dependencies')
      shouldAskForDevMode = await install(target, spinner)
    }

    spinner.succeed('Done!\n')

    if (!process.env.CI && shouldAskForDevMode) {
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

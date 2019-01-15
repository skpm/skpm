import { spawn } from 'child_process'
import { hasCommand, warn } from '.'
import getGitUser from './get-git-user'

export async function install(cwd) {
  const child = spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['install'], {
    cwd,
  })
  child.stdin.setEncoding('utf-8')
  child.stdout.setEncoding('utf-8')
  child.stderr.setEncoding('utf-8')

  let shouldAskForDevMode = false

  let stderr = ''

  child.stdout.on('data', data => {
    if (data.indexOf('The Sketch developer mode is not enabled') !== -1) {
      // answer no for know but return true so that we can ask later
      shouldAskForDevMode = true
      setTimeout(() => child.stdin.write('n\n'), 50)
    }
  })

  child.stderr.on('data', data => {
    stderr += data
  })

  return new Promise((resolve, reject) => {
    child.on('close', () => resolve(shouldAskForDevMode))
    child.on('error', err => {
      console.error(stderr)
      reject(err)
    })
  })
}

// Initializes the folder using `git init` and a proper `.gitignore` file
// if `git` is present in the $PATH.
export async function initGit(target) {
  const git = hasCommand('git')

  if (git) {
    const cwd = target

    await spawn('git', ['init'], { cwd })
    await spawn('git', ['add', '-A'], { cwd })

    const defaultGitUser = 'skpm-bot'
    const defaultGitEmail = 'bot@skpm.io'

    const gitUser = await getGitUser(defaultGitEmail, defaultGitUser)

    await spawn('git', ['commit', '-m', 'initial commit from skpm'], {
      cwd,
      env: {
        GIT_COMMITTER_NAME: gitUser.username,
        GIT_COMMITTER_EMAIL: gitUser.email,
        GIT_AUTHOR_NAME: defaultGitUser,
        GIT_AUTHOR_EMAIL: defaultGitEmail,
      },
    })
  } else {
    warn('Could not locate `git` binary in `$PATH`. Skipping!')
  }
}

// Formulate Questions if `create` args are missing
export function isMissing(argv) {
  const out = []

  const ask = (name, message, val) => {
    const type = val === undefined ? 'input' : 'confirm'
    out.push({ name, message, type, default: val })
  }

  // Required data
  !argv.dest && ask('dest', 'Directory to create the app')
  // Extra data / flags
  !argv.name && ask('name', "The plugin's name")
  !argv.force &&
    ask('force', 'Enforce `dest` directory; will overwrite!', false)
  ask('install', 'Install dependencies', true) // defaults `true`, ask anyway
  !argv.git && ask('git', 'Initialize a `git` repository', false) // defaults `true`, ask anyway

  return out
}

import spawn from 'cross-spawn-promise'
import { hasCommand, warn } from './'

export function install(cwd) {
  return spawn('npm', ['install'], {
    cwd,
    stdio: 'ignore',
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

    let gitUser
    let gitEmail
    const defaultGitUser = 'skpm-bot'
    const defaultGitEmail = 'bot@skpm.io'

    try {
      gitEmail = (await spawn('git', ['config', 'user.email'])).toString()
    } catch (e) {
      gitEmail = defaultGitEmail
    }

    try {
      gitUser = (await spawn('git', ['config', 'user.name'])).toString()
    } catch (e) {
      gitUser = defaultGitUser
    }

    await spawn('git', ['commit', '-m', 'initial commit from skpm'], {
      cwd,
      env: {
        GIT_COMMITTER_NAME: gitUser,
        GIT_COMMITTER_EMAIL: gitEmail,
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

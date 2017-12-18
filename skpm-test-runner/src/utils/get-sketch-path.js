import fs from 'fs'
import path from 'path'
import childProcess from 'child_process'

function appInfoForKey(app, key) {
  const plistPath = path.join(app, 'Contents', 'Info.plist')
  const result = childProcess.execSync(
    `/usr/libexec/PlistBuddy -c "Print :'${key}'" ${plistPath}`,
    { encoding: 'utf8' }
  )

  return result.trim()
}

function pathToAppsWithId(id) {
  return childProcess.execSync(`mdfind kMDItemCFBundleIdentifier == '${id}'`, {
    encoding: 'utf8',
  })
}

// attempts to find an app with Sketch Xcode's bundle id inside the derived data folder
export function pathToLatestXCodeBuild() {
  const output = pathToAppsWithId('com.bohemiancoding.sketch3.xcode')
  const apps = output.split('\n')
  return apps.find(app => app.indexOf('/DerivedData/') !== -1)
}

export function pathToLatestApp() {
  const output = pathToAppsWithId('com.bohemiancoding.sketch3')
  let latest = {
    version: -1,
  }
  const apps = output.split('\n')
  apps.forEach(app => {
    if (!app) {
      // empty line so bail out
      return
    }
    const version = appInfoForKey(app, 'CFBundleVersion')
    if (version > latest.version) {
      latest = {
        version,
        app,
      }
    }
  })
  if (latest.app) {
    return latest.app
  }
  return undefined
}

export function getSketchPath(app) {
  let appPath = app
  const useXCode = app === 'xcode'
  const useLatest = app === 'latest'

  if ((!appPath && !useLatest) || useXCode) {
    appPath = pathToLatestXCodeBuild()
    if (useXCode && !appPath) {
      console.error('Xcode build not found.')
      process.exit(1)
    }
  }

  if (!appPath || useLatest) {
    appPath = pathToLatestApp()
    if (useLatest && !appPath) {
      if (useXCode && !appPath) {
        console.error('Latest build not found.')
        process.exit(1)
      }
    }
  }

  if (!fs.existsSync(appPath)) {
    console.error('No Sketch application found.')
    process.exit(1)
  }

  return appPath
}

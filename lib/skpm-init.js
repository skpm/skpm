#!/usr/bin/env node
var fs = require('fs')
var chalk = require('chalk')
var path = require('path')
var program = require('commander')
var exec = require('./utils/exec').exec
var spawn = require('./utils/exec').spawn

program
  .description('Scaffold a new plugin')
  .usage('[options] [template]')
  .arguments('<template>')
  .action(function (template) {
    program.template = template
  })
  .parse(process.argv)

function defaultScaffolding () {
  return Promise.resolve().then(function () {
    var packageJSON = require(path.join(process.cwd(), 'package.json'))
    if (!packageJSON.engines) {
      packageJSON.engines = {
        sketch: '>=3.0'
      }
    }
    if (!packageJSON.devDependencies) {
      packageJSON.devDependencies = {}
    }
    if (!packageJSON.devDependencies.skpm) {
      packageJSON.devDependencies.skpm = '^' + require('../package.json').version
    }
    if (!packageJSON.skpm) {
      packageJSON.skpm = {}
    }
    if (!packageJSON.skpm.manifest) {
      packageJSON.skpm.manifest = 'src/manifest.json'
    }
    if (!packageJSON.skpm.main || !/\.sketchplugin$/.test(packageJSON.skpm.main)) {
      packageJSON.skpm.main = 'plugin.sketchplugin'
    }
    if (!packageJSON.scripts) {
      packageJSON.scripts = {}
    }
    if (!packageJSON.scripts.build) {
      packageJSON.scripts.build = 'skpm build'
    }
    if (!packageJSON.scripts.publish) {
      packageJSON.scripts.publish = 'skpm publish'
    }
    fs.writeFileSync('package.json', JSON.stringify(packageJSON, null, '\t'))
    return packageJSON
  })
  .then(function (packageJSON) {
    console.log(chalk.dim('[2/3]') + ' 🌳  Creating basic architecture...')
    fs.mkdirSync(path.join(process.cwd(), packageJSON.skpm.main || packageJSON.main))
    fs.mkdirSync(path.join(process.cwd(), 'src'))
    fs.writeFileSync(path.join(process.cwd(), 'src', 'manifest.json'), JSON.stringify(require('./utils/getManifest')(packageJSON.name), null, '\t'))
    fs.writeFileSync(path.join(process.cwd(), 'src', 'my-command.js'), 'export default function (context) {\n  context.document.showMessage(\'It\\\'s alive 🙌\')\n}\n')
    return packageJSON
  })
  .then(function (packageJSON) {
    console.log(chalk.dim('[3/3]') + ' 📜  Creating default .gitignore...')
    var gitignore = path.join(process.cwd(), '.gitignore')
    if (!fs.existsSync(gitignore)) {
      var DEFAULT_GITIGNORE =
`# build artefacts
${packageJSON.skpm.main || packageJSON.main}/Contents/Sketch
${packageJSON.skpm.main || packageJSON.main}/Contents/Resources/_webpack_images

# npm
node_modules
.npm
npm-debug.log

# mac
.DS_Store
`
      fs.writeFileSync(gitignore, DEFAULT_GITIGNORE)
    }
  })
}

function templateScaffolding () {
  // storing package.json
  var packageJSON = require(path.join(process.cwd(), 'package.json'))

  return Promise.resolve().then(function () {
    console.log(chalk.dim('[2/3]') + ' 💾  Downloading template...')

    // try fetching `skpm-template-*` first
    return exec('npm pack skpm-template-' + program.template)
      .catch(function () {
        return exec('npm pack ' + program.template)
      }).then(function (res) {
        return res.stdout.trim()
      })
  })
  .then(function (tarFile) {
    console.log(chalk.dim('[3/3]') + ' 📨  Unpacking template...')
    var tar = require('tar.gz')
    return tar().extract(tarFile, '.')
    .then(function () {
      return Promise.all([
        exec('rm -rf ' + tarFile),
        // the tarball is extracted in a `package` folder,
        // so we need to copy its content
        new Promise(function (resolve, reject) {
          require('cpr')('package', '.', {overwrite: true}, function (err) {
            if (err) {
              return reject(err)
            }
            resolve()
          })
        })
      ])
    })
  })
  .then(function () {
    var tarPackageJSON = require(path.join(process.cwd(), 'package', 'package.json'))
    if (tarPackageJSON.engines) {
      packageJSON.engines = tarPackageJSON.engines
    }
    if (!packageJSON.engines) {
      packageJSON.engines = {
        sketch: '>=3.0'
      }
    }
    if (tarPackageJSON.manifest) {
      packageJSON.manifest = tarPackageJSON.manifest
    }
    if (tarPackageJSON.dependencies) {
      packageJSON.dependencies = tarPackageJSON.dependencies
    }
    if (tarPackageJSON.devDependencies) {
      packageJSON.devDependencies = tarPackageJSON.devDependencies
    }
    if (!packageJSON.devDependencies) {
      packageJSON.devDependencies = {}
    }
    if (!packageJSON.devDependencies.skpm) {
      packageJSON.devDependencies.skpm = '^' + require('../package.json').version
    }
    if (tarPackageJSON.main) {
      packageJSON.main = tarPackageJSON.main
    }
    if (tarPackageJSON.skpm) {
      packageJSON.skpm = tarPackageJSON.skpm
    }
    if (!packageJSON.skpm) {
      packageJSON.skpm = {}
    }
    if (!packageJSON.skpm.manifest) {
      packageJSON.skpm.manifest = 'src/manifest.json'
    }
    if (!packageJSON.skpm.main || !/\.sketchplugin$/.test(packageJSON.skpm.main)) {
      packageJSON.skpm.main = 'plugin.sketchplugin'
    }

    if (tarPackageJSON.scripts) {
      packageJSON.scripts = tarPackageJSON.scripts
    } else {
      if (!packageJSON.scripts) {
        packageJSON.scripts = {}
      }
      if (!packageJSON.scripts.build) {
        packageJSON.scripts.build = 'skpm build'
      }
      if (!packageJSON.scripts.publish) {
        packageJSON.scripts.publish = 'skpm publish'
      }
    }
    fs.writeFileSync('package.json', JSON.stringify(packageJSON, null, '\t'))
  })
  .then(function () {
    return exec('rm -rf package')
  })
}

Promise.resolve()
.then(function () {
  console.log(chalk.dim('[1/3]') + ' 📦  Creating package.json...')
  return spawn('npm', ['init'])
})
.then(program.template ? templateScaffolding : defaultScaffolding)
.then(function () {
  console.log(chalk.green('success') + ' Plugin initialized')
  process.exit(0)
})
.catch(function (err) {
  console.log(chalk.red('error') + ' Error while initializing the plugin')
  console.log((err || {}).body || err)
  process.exit(1)
})

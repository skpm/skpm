#!/usr/bin/env node
var fs = require('fs')
var chalk = require('chalk')
var path = require('path')
var program = require('commander')
var exec = require('./exec').spawn

program
  .usage('[options]')
  .parse(process.argv)

Promise.resolve()
.then(function () {
  console.log(chalk.dim('[1/3]') + ' 📦  Creating package.json...')
  return exec('npm', ['init'])
})
.then(function () {
  var packageJSON = require(path.join(process.cwd(), 'package.json'))
  if (!packageJSON.manifest) {
    packageJSON.manifest = 'src/manifest.json'
  }
  if (!packageJSON.devDependencies) {
    packageJSON.devDependencies = {}
  }
  if (!packageJSON.devDependencies.skpm) {
    packageJSON.devDependencies.skpm = '^' + require('../package.json').version
  }
  if (!packageJSON.main || !/\.sketchplugin$/.test(packageJSON.main)) {
    packageJSON.main = 'plugin.sketchplugin'
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
  fs.mkdirSync(path.join(process.cwd(), packageJSON.main))
  fs.mkdirSync(path.join(process.cwd(), 'src'))
  fs.writeFileSync(path.join(process.cwd(), 'src', 'manifest.json'), JSON.stringify(require('./getManifest')(packageJSON.name), null, '\t'))
  fs.writeFileSync(path.join(process.cwd(), 'src', 'my-command.js'), 'export default function (context) {\n  context.document.showMessage(\'It\\\'s alive 🙌\')\n}\n')
  return packageJSON
})
.then(function (packageJSON) {
  console.log(chalk.dim('[3/3]') + ' 📜  Creating default .gitignore...')
  var gitignore = path.join(process.cwd(), '.gitignore')
  if (!fs.existsSync(gitignore)) {
    fs.writeFileSync(gitignore, '# build artefacts\n' + packageJSON.main + '/Content/Sketch\n\n# npm\nnode_modules\n.npm\n\n# mac\n.DS_Store')
  }
})
.then(function () {
  console.log(chalk.green('success') + ' Plugin initialized')
  process.exit(0)
})
.catch(function (err) {
  console.log(chalk.red('error') + ' Error while initializing the plugin')
  console.log((err || {}).body || err)
  process.exit(1)
})

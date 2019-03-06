const path = require('path')
const globby = require('globby')
const { Minimatch } = require('minimatch')
const { readDir, stat, readFile, writeFile } = require('./fs')

const isIgnoredByPatterns = patterns => {
  if (!patterns) {
    return () => false
  }
  const matches = patterns.map(pattern => {
    const minimatch = Minimatch(pattern, { dot: true })
    return minimatch.match.bind(minimatch)
  })
  return filePath => matches.some(m => m(filePath))
}

const isTestFile = options => {
  const ignoredByPatterns = isIgnoredByPatterns(options.ignore)
  const ignoredByGitignore =
    options.gitignore !== false ? globby.gitignore.sync() : () => false
  const isIgnored = filePath =>
    ignoredByPatterns(filePath) || ignoredByGitignore(filePath)

  return async (inputDir, fullPath) => {
    const relativePath = fullPath.split(inputDir)[1]

    if (isIgnored(relativePath)) {
      return false
    }

    if ((await stat(fullPath)).isDirectory()) {
      return 'dir'
    }

    if (!options.testRegex.test(relativePath)) {
      return false
    }

    if (
      options.manualMatches &&
      options.manualMatches.every(match => relativePath.indexOf(match) === -1)
    ) {
      return false
    }

    return 'file'
  }
}

function findAllTestFiles(_inputDir, _dir, options) {
  const _isTestFile = isTestFile(options)

  const testFiles = []

  const recurse = async (inputDir, dir) => {
    const files = await readDir(dir)
    await Promise.all(
      files.map(file => {
        const fullPath = path.join(dir, file)

        return (async () => {
          const res = await _isTestFile(inputDir, fullPath)
          if (!res) {
            return
          }
          if (res === 'dir') {
            await recurse(inputDir, fullPath)
            return
          }
          let name = file.split('/')
          name = name[name.length - 1]
          name = name.replace('.js', '').replace('.test', '')
          testFiles.push({
            name,
            path: fullPath,
          })
        })()
      })
    )
  }

  return recurse(_inputDir, _dir).then(() => testFiles)
}

module.exports.isTestFile = isTestFile
module.exports.findAllTestFiles = findAllTestFiles

module.exports.buildTestFile = async (inputDir, outputFile, options) => {
  const pluginPath = path.join(
    __dirname,
    '../../test-runner.sketchplugin/Contents/Sketch'
  )
  const testFiles = await findAllTestFiles(inputDir, inputDir, options)

  const indexJS = (await readFile(
    path.join(pluginPath, 'tests-template.js'),
    'utf8'
  )).replace(
    '/* {{IMPORTS}} */',
    testFiles.reduce(
      (prev, file) => `${prev}
  try {
    testSuites.suites[${JSON.stringify(file.name)}] = require('${path.relative(
        pluginPath,
        file.path
      )}')
  } catch (err) {
    testResults.push({
      name: ${JSON.stringify(file.name)},
      type: 'failed',
      exec: true,
      reason: getTestFailure(err),
    })
  }
`,
      ''
    )
  )

  await writeFile(
    outputFile,
    `/* ⛔⚠️ THIS IS A GENERATED FILE. DO NOT MODIFY THIS ⛔⚠️ */\n\n${indexJS}`,
    'utf8'
  )

  return testFiles
}

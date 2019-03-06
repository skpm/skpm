const fs = require('fs')
const path = require('path')
const globby = require('globby')
const { Minimatch } = require('minimatch')

const readFile = (filePath, options) =>
  new Promise((resolve, reject) => {
    fs.readFile(filePath, options, (err, res) => {
      if (err) {
        reject(err)
        return
      }
      resolve(res)
    })
  })

const writeFile = (filePath, data, options) =>
  new Promise((resolve, reject) => {
    fs.writeFile(filePath, data, options, (err, res) => {
      if (err) {
        reject(err)
        return
      }
      resolve(res)
    })
  })

const readDir = filePath =>
  new Promise((resolve, reject) => {
    fs.readdir(filePath, (err, res) => {
      if (err) {
        reject(err)
        return
      }
      resolve(res)
    })
  })

const stat = filePath =>
  new Promise((resolve, reject) => {
    fs.stat(filePath, (err, res) => {
      if (err) {
        reject(err)
        return
      }
      resolve(res)
    })
  })

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

function findAllTestFiles(_inputDir, _dir, options) {
  const ignoredByPatterns = isIgnoredByPatterns(options.ignore)
  const ignoredByGitignore =
    options.gitignore !== false ? globby.gitignore.sync() : () => false
  const isIgnored = filePath =>
    ignoredByPatterns(filePath) || ignoredByGitignore(filePath)

  const testFiles = []

  const recurse = async (inputDir, dir) => {
    const files = await readDir(dir)
    await Promise.all(
      files.reduce((prev, file) => {
        const fullPath = path.join(dir, file)
        const relativePath = fullPath.split(inputDir)[1]

        if (isIgnored(relativePath)) {
          return prev
        }
        prev.push(
          (async () => {
            if ((await stat(fullPath)).isDirectory()) {
              await recurse(inputDir, fullPath)
            }
            if (!options.testRegex.test(relativePath)) {
              return
            }
            if (
              options.manualMatches &&
              options.manualMatches.every(
                match => relativePath.indexOf(match) === -1
              )
            ) {
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
        )
        return prev
      }, [])
    )
  }

  return recurse(_inputDir, _dir).then(() => testFiles)
}

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

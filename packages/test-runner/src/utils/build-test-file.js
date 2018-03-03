const fs = require('fs')
const path = require('path')
const globby = require('globby')
const { Minimatch } = require('minimatch')

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

export function findAllTestFiles(_inputDir, _dir, options) {
  const ignoredByPatterns = isIgnoredByPatterns(options.ignore)
  const ignoredByGitignore =
    options.gitignore !== false ? globby.gitignore.sync() : () => false
  const isIgnored = filePath =>
    ignoredByPatterns(filePath) || ignoredByGitignore(filePath)

  function recurse(inputDir, dir) {
    const files = fs.readdirSync(dir)
    return files.reduce((prev, file) => {
      const fullPath = path.join(dir, file)
      const relativePath = fullPath.split(inputDir)[1]

      if (isIgnored(relativePath)) {
        return prev
      }
      if (fs.statSync(fullPath).isDirectory()) {
        return prev.concat(recurse(inputDir, fullPath, options))
      } else if (options.testRegex.test(relativePath)) {
        let name = file.split('/')
        name = name[name.length - 1]
        name = name.replace('.js', '').replace('.test', '')
        prev.push({
          name,
          path: fullPath,
        })
      }
      return prev
    }, [])
  }

  return recurse(_inputDir, _dir)
}

export function buildTestFile(inputDir, outputFile, options) {
  const pluginPath = path.join(
    __dirname,
    '../../test-runner.sketchplugin/Contents/Sketch'
  )
  const testFiles = findAllTestFiles(inputDir, inputDir, options)

  const indexJS = fs
    .readFileSync(path.join(pluginPath, 'tests-template.js'), 'utf8')
    .replace(
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
      reason: {
        message: err.message,
        name: err.name,
        stack: prepareStackTrace(err.stack),
      },
    })
  }
`,
        ''
      )
    )

  fs.writeFileSync(
    outputFile,
    `/* ⛔⚠️ THIS IS A GENERATED FILE. DO NOT MODIFY THIS ⛔⚠️ */\n\n${indexJS}`,
    'utf8'
  )

  return testFiles
}

const fs = require('fs')
const path = require('path')

export function findAllTestFiles(inputDir, dir, options) {
  const files = fs.readdirSync(dir)
  return files.reduce((prev, file) => {
    const fullPath = path.join(dir, file)
    const relativePath = fullPath.split(inputDir)[1]
    if (options.ignore.some(ignoredPath => fullPath.match(ignoredPath))) {
      return prev
    }
    if (fs.statSync(fullPath).isDirectory()) {
      return prev.concat(findAllTestFiles(inputDir, fullPath, options))
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
      name: 'loading the test suite',
      type: 'failed',
      suite: ${JSON.stringify(file.name)},
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

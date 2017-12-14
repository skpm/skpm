const fs = require('fs')
const path = require('path')

let gitignore
try {
  gitignore = fs.readFileSync(path.join(process.cwd(), './.gitignore'), 'utf8')
} catch (err) {
  gitignore = ''
}
gitignore = gitignore.split('\n').filter(l => l)

export function findAllTestFiles(inputDir, dir, options) {
  const files = fs.readdirSync(dir)
  const testRegex = new RegExp(options.testRegex)
  return files.reduce((prev, file) => {
    const fullPath = path.join(dir, file)
    const relativePath = fullPath.split(inputDir)[1]
    if (gitignore.some(ignoredPath => fullPath.match(ignoredPath))) {
      return prev
    }
    if (fs.statSync(fullPath).isDirectory()) {
      return prev.concat(findAllTestFiles(inputDir, fullPath, options))
    } else if (testRegex.test(relativePath)) {
      prev.push(fullPath)
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
        (prev, file, i) =>
          `${prev}import * as suite${i} from '${path.relative(
            pluginPath,
            file
          )}'\n`,
        '\n'
      )
    )
    .replace(
      '/* {{SUITES}} */',
      testFiles.reduce((prev, file, i) => {
        let name = file.split('/')
        name = name[name.length - 1]
        name = name.replace('.js', '').replace('.test', '')
        return `${prev}    ${JSON.stringify(name)}: suite${i},\n`
      }, '\n')
    )

  fs.writeFileSync(
    outputFile,
    `/* ⛔⚠️ THIS IS A GENERATED FILE. DO NOT MODIFY THIS ⛔⚠️ */\n\n${indexJS}`,
    'utf8'
  )
}

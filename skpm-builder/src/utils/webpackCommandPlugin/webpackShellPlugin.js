import { get as getConfig } from '@skpm/utils/tool-config'
import { exec } from '@skpm/utils/exec'
import chalk from 'chalk'

const config = getConfig()

export function sketchtoolRunCommand(
  output,
  commandIdentifier,
  withoutActivating,
  rest
) {
  let command = `"${process.env.SKETCH_PATH ||
    config.sketchPath}/Contents/Resources/sketchtool/bin/sketchtool" run "${output}" "${commandIdentifier}"`

  if (withoutActivating) {
    command += ' --without-activating'
  }

  if (rest) {
    command += ' '
    command += rest
  }

  const handleError =
    // check if the run command doesn't exist
    'if (echo "$res" | grep "Unknown command ‘run’"); then ' +
    'echo "Only available on Sketch 43+"; ' +
    // check if we can't find sketch
    'elif (echo "$res" | grep "such file or directory"); then ' +
    'echo "Looks like we can\'t find Sketch.app.\\nYou can specify where to look for it by running:\\n\\necho \\"sketchPath: ABSOLUTE/PATH/TO/Sketch.app\\" > ~/.skpmrc"; ' +
    // not sure why else doesn't work
    'elif (true); then ' +
    'echo "$res"; ' +
    'fi'

  // run the command and redirect the stderr to stdout so that we can check against it
  return `res=$(${command} 2>&1); ${handleError}`
}

export default function WebpackShellPlugin(options) {
  return {
    apply(compiler) {
      compiler.plugin('after-emit', (compilation, callback) => {
        if (options.script) {
          exec(options.script, { shell: '/bin/bash' })
            .then(res => {
              if (res.stderr) {
                console.error(
                  `${chalk.red(
                    'error'
                  )} Error while running the command after build`
                )
                console.error(res.stderr)
              }
              if (res.stdout.trim().length > 0) {
                res.stdout
                  .trim()
                  .split('\n')
                  .forEach(line => {
                    console.log(line)
                  })
              }
            })
            .then(callback)
            .catch(err => {
              console.error(
                `${chalk.red(
                  'error'
                )} Error while running the command after build`
              )
              console.error(err)
              callback()
            })
        } else {
          callback()
        }
      })
    },
  }
}

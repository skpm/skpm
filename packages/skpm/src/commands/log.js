import childProcess from 'child_process'
import { get as getConfig } from '@skpm/utils/tool-config'
import { exec } from '@skpm/utils/exec'
import asyncCommand from '../utils/async-command'
import { error } from '../utils'

const config = getConfig()

export default asyncCommand({
  command: 'log',

  desc: 'Show the Sketch plugins logs.',

  builder: {
    f: {
      description:
        'The `-f` option causes tail to not stop when end of file is reached, but rather to wait for additional data to be appended to the input.',
      type: 'boolean',
      alias: 'F',
      default: 'false',
    },
    number: {
      description: 'Shows `number` lines of the logs.',
      type: 'number',
      alias: 'n',
    },
  },

  handler(argv, done) {
    const args = []

    if (argv.f) {
      args.push('-F')
    } else if (argv.number !== undefined) {
      args.push(`-n ${argv.number}`)
    }

    args.push(config.logsLocation)

    let restarted = false

    const child = childProcess.spawn('tail', args, {
      cwd: process.cwd(),
    })

    if (child.stdout) {
      child.stdout.on('data', data => {
        console.log(
          String(data)
            .replace(/ «Plugin Output»/g, '')
            .replace(/\n$/g, '')
        )
      })
    }

    if (child.stderr) {
      child.stderr.on('data', data => {
        const dataString = String(data)
        if (dataString.indexOf('No such file or directory')) {
          restarted = true
          return exec(`touch "${config.logsLocation}"`)
            .then(() => {
              this.handler(argv, done)
            })
            .catch(err => {
              error('while reading the logs')
              done(err)
            })
        }
        return console.error(String(data))
      })
    }

    child.on('exit', () => {
      if (!restarted) {
        done()
      }
    })

    child.on('error', err => {
      error('while reading the logs')
      done(err)
    })
  },
})

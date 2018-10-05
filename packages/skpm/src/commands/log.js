import childProcess from 'child_process'
import { exec } from '@skpm/internal-utils/exec'
import asyncCommand from '../utils/async-command'
import { error } from '../utils'

const homedir = require('os').homedir()

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

    const childProcesses = []

    function killAll() {
      childProcesses.forEach(child => {
        if (!child.killed) {
          child.kill()
        }
      })
    }

    function listenToLogs(logsLocation) {
      let restarted = false

      const child = childProcess.spawn('tail', [...args, logsLocation], {
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
            return exec(`touch "${logsLocation}"`)
              .then(() => {
                this.handler(argv, done)
              })
              .catch(err => {
                if (err.message.indexOf('No such file or directory')) {
                  return
                }
                error('while reading the logs')
                done(err)
              })
          }
          return console.error(String(data))
        })
      }

      child.on('exit', () => {
        if (!restarted) {
          killAll()
          done()
        }
      })

      child.on('error', err => {
        error('while reading the logs')
        killAll()
        done(err)
      })

      childProcesses.push(child)
    }

    ;[
      `${homedir}/Library/Logs/com.bohemiancoding.sketch3/Plugin Output.log`,
      `${homedir}/Library/Logs/com.bohemiancoding.sketch3/Plugin Log.log`,
      `${homedir}/Library/Logs/com.bohemiancoding.sketch3.xcode/Plugin Log.log`,
      `${homedir}/Library/Logs/com.bohemiancoding.sketch3.beta/Plugin Log.log`,
    ].forEach(listenToLogs)

    if (!childProcesses.length) {
      done()
    }
  },
})

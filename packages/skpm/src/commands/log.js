import childProcess from 'child_process'
import { exec } from '@skpm/internal-utils/exec'
import replaceArraysByLastItem from '@skpm/internal-utils/replace-arrays-by-last-item'
import asyncCommand from '../utils/async-command'
import { error } from '../utils'

const homedir = require('os').homedir()

const logLocations = [
  `${homedir}/Library/Logs/com.bohemiancoding.sketch3/Plugin Output.log`,
  `${homedir}/Library/Logs/com.bohemiancoding.sketch3/Plugin Log.log`,
  `${homedir}/Library/Logs/com.bohemiancoding.sketch3.xcode/Plugin Log.log`,
  `${homedir}/Library/Logs/com.bohemiancoding.sketch3.beta/Plugin Log.log`,
  `${homedir}/Library/Logs/com.bohemiancoding.sketch3.private/Plugin Log.log`,
]

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
    replaceArraysByLastItem(argv, ['f', 'number'])

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

    const count = logLocations.reduce((prev, logsLocation) => {
      prev[logsLocation] = 1
      return prev
    }, {})
    function checkEnd(logsLocation) {
      count[logsLocation] -= 1
      if (Object.keys(count).every(k => count[k] <= 0)) {
        killAll()
        done()
      }
    }

    function listenToLogs(logsLocation) {
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
            count[logsLocation] += 1
            // touch the file so that we can listen to it
            return (
              exec(`touch "${logsLocation}"`)
                // restart the listening for this log
                .then(() => listenToLogs(logsLocation))
                .catch(err => {
                  // if we can't create the file it means that the variant is not present
                  if (err.message.indexOf('No such file or directory')) {
                    checkEnd(logsLocation)
                    return
                  }
                  error('while reading the logs')
                  done(err)
                })
            )
          }
          return console.error(String(data))
        })
      }

      child.on('exit', () => {
        checkEnd(logsLocation)
      })

      child.on('error', err => {
        error('while reading the logs')
        killAll()
        done(err)
      })

      childProcesses.push(child)
    }

    logLocations.forEach(listenToLogs)

    if (!childProcesses.length) {
      done()
    }
  },
})

import { error } from './index'

function done(err, result) {
  if (err) {
    error(String(err))
    if (err.stdout) {
      console.log(err.stdout)
    }
    if (err.stderr) {
      console.error(err.stderr)
    }
    if (err.stack) {
      console.error(err.stack)
    }
    process.exit(err.exitCode || 1)
  } else {
    if (result) process.stdout.write(`${result}\n`)
    process.exit(0)
  }
}

export default function asyncCommand(options) {
  return {
    ...options,
    builder(yargs) {
      if (options.builder) {
        Object.keys(options.builder).forEach(option => {
          if (option.positional) {
            yargs.positional(option, options.builder[option])
          } else {
            yargs.option(option, options.builder[option])
          }
        })
      }
    },
    handler(argv) {
      const r = options.handler(argv, done)
      if (r && r.then) r.then(result => done(null, result), done)
    },
  }
}

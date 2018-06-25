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
    handler(argv) {
      const r = options.handler(argv, done)
      if (r && r.then) r.then(result => done(null, result), done)
    },
  }
}

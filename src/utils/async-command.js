function done(err, result) {
  if (err) {
    process.stderr.write(`\n${String(err)}\n`)
    if (err.stdout) {
      process.stdout.write(`${err.stdout}\n`)
    }
    if (err.stderr) {
      process.stderr.write(`${err.stderr}\n`)
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

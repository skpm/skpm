const childProcess = require('child_process')

module.exports.exec = function exec(command, options) {
  return new Promise((resolve, reject) => {
    childProcess.exec(command, options, (error, stdout, stderr) => {
      if (error) {
        return reject(error)
      }
      return resolve({
        stdout,
        stderr,
      })
    })
  })
}

module.exports.execFile = function execFile(command, options) {
  return new Promise((resolve, reject) => {
    childProcess.execFile(command, options, (error, stdout, stderr) => {
      if (error) {
        return reject(error)
      }
      return resolve({
        stdout,
        stderr,
      })
    })
  })
}

module.exports.spawn = function spawn(command, args) {
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn(command, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
    })

    child.on('exit', () => {
      resolve()
    })

    child.on('error', err => {
      reject(err)
    })
  })
}

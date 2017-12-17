import isCI from 'is-ci'

module.exports = process.stdout.isTTY && !isCI

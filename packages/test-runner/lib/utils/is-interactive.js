const isCI = require('is-ci')

module.exports = process.stdout.isTTY && !isCI

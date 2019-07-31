const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const objectAssign = require('object-assign')
const homedir = require('os').homedir()

const CONFIG_FILE_NAME = '.skpmrc'
const DEFAULT_CONFIG = {
  sketchPath: '/Applications/Sketch.app',
  pluginDirectory: `${homedir}/Library/Application Support/com.bohemiancoding.sketch3/Plugins/`,
  logsLocation: `${homedir}/Library/Logs/com.bohemiancoding.sketch3/Plugin Output.log`,
  plugins: {},
  notarisation: undefined,
}

module.exports = {
  get() {
    const homeConfig = fs.existsSync(path.join(homedir, CONFIG_FILE_NAME))
      ? yaml.safeLoad(
          fs.readFileSync(path.join(homedir, CONFIG_FILE_NAME), 'utf8')
        )
      : {}
    const localConfig = fs.existsSync(
      path.join(process.cwd(), CONFIG_FILE_NAME)
    )
      ? yaml.safeLoad(
          fs.readFileSync(path.join(process.cwd(), CONFIG_FILE_NAME), 'utf8')
        )
      : {}
    return objectAssign({}, DEFAULT_CONFIG, homeConfig, localConfig)
  },

  save(config) {
    // only save the config which is not the default
    const configToSave = Object.keys(config).reduce(
      (prev, k) => {
        if (config[k] !== DEFAULT_CONFIG[k]) {
          prev[k] = config[k]
        }
        return prev
      },
      { plugins: config.plugins }
    )
    fs.writeFileSync(
      path.join(homedir, CONFIG_FILE_NAME),
      yaml.safeDump(configToSave),
      'utf8'
    )
  },

  delete() {
    fs.unlinkSync(path.join(homedir, CONFIG_FILE_NAME))
  },
}

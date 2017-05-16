var fs = require('fs')
var path = require('path')
var yaml = require('js-yaml')
var objectAssign = require('object-assign')
var CONFIG_PATH = path.join(require('os').homedir(), '.skpmrc')
var DEFAULT_CONFIG = {
  sketchPath: '/Applications/Sketch.app',
  pluginDirectory: require('os').homedir() + '/Library/Application Support/com.bohemiancoding.sketch3/Plugins/',
  logsLocation: require('os').homedir() + '/Library/Logs/com.bohemiancoding.sketch3/Plugin Output.log',
  registryURL: 'https://mahcfk07h5.execute-api.eu-west-1.amazonaws.com/prod/registry/',
  plugins: {}
}

module.exports = {
  get: function () {
    if (!fs.existsSync(CONFIG_PATH)) {
      return DEFAULT_CONFIG
    }
    return objectAssign({}, DEFAULT_CONFIG, yaml.safeLoad(fs.readFileSync(CONFIG_PATH, 'utf8')))
  },

  save: function (config) {
    // only save the config which is not the default
    var configToSave = Object.keys(config).reduce(function (prev, k) {
      if (config[k] !== DEFAULT_CONFIG[k]) {
        prev[k] = config[k]
      }
    }, {plugins: config.plugins})
    fs.writeFileSync(CONFIG_PATH, yaml.safeDump(configToSave), 'utf8')
  },

  delete: function () {
    fs.unlinkSync(CONFIG_PATH)
  }
}

/* eslint-disable */
var onRun = function(context) {
  if (!context.pluginIdentifier) {
    log('missing plugin identifier in the context')
    return
  }
  const pm = AppController.sharedInstance().pluginManager()
  const plugin = pm.plugins()[context.pluginIdentifier]
  if (!plugin) {
    return
  }

  // trigger the shutdown action for the plugin
  pm.sendToCommandActionsForPlugin_withID_context(plugin, 'Shutdown', {})

  // force clearing the finished command
  pm.cleanupFinishedCommands()

  // trigger the startup action for the plugin
  pm.sendToCommandActionsForPlugin_withID_context(plugin, 'Startup', {})
}

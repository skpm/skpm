# Build Configuration

Skpm is build on top of [`Webpack`](https://webpack.js.org) and [`Babel`](https://babeljs.io). It ships with a default configuration that will support most use-cases. If you need to modify them, you can of course do so.

## Babel

To customize Babel, you have two options:

* You may create a [`.babelrc`](https://babeljs.io/docs/usage/babelrc) file in your project's root directory. Any settings you define here will overwrite matching config-keys within skpm preset. For example, if you pass a "presets" object, it will replace & reset all Babel presets that skpm defaults to.

* If you'd like to modify or add to the existing Babel config, you must use a `webpack.skpm.config.js` file. Visit the [Webpack](#webpack) section for more info.

## Webpack

To customize Webpack, create `webpack.skpm.config.js` file which exports a function that will change webpack's config.

```js
/**
 * Function that mutates original webpack config.
 * Supports asynchronous changes when promise is returned.
 *
 * @param {object} config - original webpack config.
 * @param {boolean} isPluginCommand - wether the config is for a plugin command or an asset
 **/
module.exports = function(config, isPluginCommand) {
  /** you can change config here **/
}
```

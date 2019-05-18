// We need to do a bit of magic to allow the es6 module syntax to work

const { ConcatSource } = require('webpack-sources')

// expose the context as a global so that polyfills can use it
// without passing it all the way down
const header = `var globalThis = this;
function __skpm_run (key, context) {
  globalThis.context = context;
`
// exports is defined here by webpack
const footer = definedKeys => `  if (key === 'default' && typeof exports === 'function') {
    exports(context);
  } else if (typeof exports[key] !== 'function') {
    throw new Error('Missing export named "' + key + '". Your command should contain something like \`export function " + key +"() {}\`.');
  } else {
    exports[key](context);
  }
}
${definedKeys
  .map(k => {
    if (k === 'onRun') {
      return `globalThis['${k}'] = __skpm_run.bind(this, 'default')`
    }
    if (k === 'run') {
      return `globalThis['${k}'] = __skpm_run.bind(this, 'default')`
    }
    return `globalThis['${k}'] = __skpm_run.bind(this, '${k}')`
  })
  .join(';\n')}
`

/* eslint-disable no-not-accumulator-reassign/no-not-accumulator-reassign */
module.exports = function WebpackHeaderFooterPlugin(definedKeys) {
  return {
    apply(compiler) {
      compiler.hooks.compilation.tap('HeaderFooter', compilation => {
        compilation.hooks.optimizeChunkAssets.tap('HeaderFooter', chunks => {
          chunks.forEach(chunk => {
            chunk.files.forEach(file => {
              compilation.assets[file] = new ConcatSource(
                header,
                '\n',
                compilation.assets[file],
                '\n',
                footer(definedKeys)
              )
            })
          })
        })
      })
    },
  }
}

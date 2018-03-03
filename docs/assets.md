# Adding Assets

`Skpm` supports two different types of assets:

* JavaScript assets that need to be compiles (for example the script running in a webiew)
* any files the need to be bundled with your plugin

## JavaScript assets

To specify the javascript files that need to be compiled and bundled into your plugin, you need to add a field in your `package.json` called `resources` (either at the root or nested in a `skpm` object:

For example, to compile all the JavaScript files in a `resources` folder:

```diff
{
  ...
  "skpm": {
    ...
+     "resources": [
+       "resources/**/*.js"
+     ]
    ...
  }
}
```

Let's say that there is a `resources/webview.js` file, it will be compiled and the output will be found in `plugin.sketchplugin/Contents/Resources/webview.js`. Note that the first folder (`resources` in this case) is stripped off from the output path.

To modify the webpack config applied to the file, check out the [Build configuration](./build-configuration.md) documentation.

## Any assets

In order to "copy/paste" files into the plugin bundle, you need to add a field in your `package.json` called `assets` (either at the root or nested in a `skpm` object:

For example, to bundle all the files in an `assets` folder:

```diff
{
  ...
  "skpm": {
    ...
+     "assets": [
+       "assets/**/*"
+     ]
    ...
  }
}
```

Let's say that there is a `assets/icon.png` file, it will be found in `plugin.sketchplugin/Contents/Resources/icon.png`. Note that the first folder (`assets` in this case) is stripped off from the output path.

You can access the files in `plugin.sketchplugin/Contents/Resources` with `context.plugin.urlForResourceNamed('icon.png)`.

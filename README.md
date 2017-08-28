<h1 align="center">skpm - Sketch Plugin Manager</h1>

<div align="center">
  <img src="https://avatars0.githubusercontent.com/u/24660874?v=3&s=200" />
</div>
<br />
<div align="center">
  <strong>A utility to build, publish, install and manage <a href="https://www.sketchapp.com/">sketch</a> plugins.</strong>
</div>

## Installation

```bash
npm install -g skpm
```

_The `npm` command-line tool is bundled with Node.js. If you have it installed, then you already have npm too. If not, go download [Node.js](https://nodejs.org/en/download/)._

## Usage

* [Scaffold the architecture of a new plugin](#scaffold-the-architecture-of-a-new-plugin)
* [Build the plugin](#build-the-plugin)
* [View the plugin's log](#view-the-plugin-s-log)
* [Symlinking the local plugin to the sketch plugins folder](#symlinking-the-local-plugin-to-the-sketch-plugins-folder)
* [Publish the plugin on the registry](#publish-the-plugin-on-the-registry)

## Documentation

#### Scaffold the architecture of a new plugin

To interactively create the architecture to start developing a new plugin (see the [sketch documentation](http://developer.sketchapp.com/introduction/plugin-bundles/) for more information):

```bash
skpm init
```

This will create:
* a `package.json` file
* a `src` folder with:
  * a `manifest.json` file
  * a `command.js` file for an example of command
* a `.gitignore` file if non-existent

The `package.json` must contain 3 specific fields:
* `skpm.main`: pointing to your `.sketchplugin`
* `skpm.manifest`: pointing to your `manifest.json` (`src/manifest.json` by default)
* `repository`: pointing to your github repository

#### Build the plugin

To transpile the JavaScript to CocoaScript and copy the `manifest.json` to the `.sketchplugin`:
```bash
skpm build
```

To watch for changes:

```bash
skpm build --watch
```

Additionally, some fields from the `package.json` will be set in the `manifest.json` (if not present):
* version
* name
* description
* homepage
* appcast

#### View the plugin's log

To view the output of your `console.log`, you have a few different options:
* Open `Console.app` and look for the sketch logs
* Use Safari's web inspector to debug your plugin's javascript context
* Look at the `~/Library/Logs/com.bohemiancoding.sketch3/Plugin Output.log` file

Skpm provides a convenient way to do the latter:

```bash
skpm log
```

The `-f` option causes `skpm log` to not stop when the end of logs is reached, but rather to wait for additional data to be appended to the input

#### Symlinking the local plugin to the sketch plugins folder

```bash
skpm link path-to-local-plugin
```

It will also ask you if you want to [disable the caching mechanism](http://developer.sketchapp.com/introduction/preferences/#always-reload-scripts-before-running) and force Sketch to always reload a Plugin’s code from disk (recommended when developing).

#### Publish the plugin on the registry

To publish a new version of the plugin to the registry:
```bash
skpm publish <newversion> | major | minor | patch | premajor | preminor | prepatch | prerelease
```

The exact order of execution is as follows:
* Run the `preversion` script
* Bump `version` in package.json as requested (`patch`, `minor`, `major`, etc).
* Run the `version` script
* Commit and tag
* Run the `postversion` script.
* Run the `build` script
* Zip the folder specified in the `main` field
* Create a draft release on GitHub
* Upload the zip to GitHub
* Publish the release
* Remove the zip
* Check the [sketchplugins/plugin-directory](https://github.com/sketchplugins/plugin-directory) repo to see if the plugin is already there. If not, open a PR to add it.

## License

[MIT](https://tldrlegal.com/license/mit-license)

<h1 align="center">skpm - Sketch Plugin Manager</h1>

<div align="center">
  <img src="https://avatars0.githubusercontent.com/u/24660874?v=3&s=200" />
</div>
<br />
<div align="center">
  <strong>A utility to create, build and publish <a href="https://www.sketchapp.com/">sketch</a> plugins.</strong>
</div>

## Installation

> Important: [Node.js](https://nodejs.org/en/download/) > V6.x is a minimum requirement. You also need the [command line tools](http://osxdaily.com/2014/02/12/install-command-line-tools-mac-os-x/) installed.

```bash
npm install -g skpm
```

## Usage

```bash
skpm create my-plugin
```

The above command pulls the template from [skpm/skpm](https://github.com/skpm/skpm/tree/master/template), prompts for some information, and generates the project at ./my-plugin/.

* [Create a new plugin](#create-a-new-plugin)
* [Build the plugin](#build-the-plugin)
* [View the plugin's log](#view-the-plugins-log)
* [Publish the plugin on the registry](#publish-the-plugin-on-the-registry)

#### Create a new plugin

```bash
skpm create <plugin-name>

--name        The plugin display name.
--cwd         A directory to use instead of $PWD.
--force       Force option to create the directory for the new app. [boolean] [default: false]
--template    The repository hosting the template to start from.    [string]  [default: skpm/skpm]
--git         Initialize version control using git.                 [boolean] [default: true]
--install     Installs dependencies.                                [boolean] [default: true]
```

> ##### A note on templates
>
> The purpose of official skpm plugin templates are to provide opinionated development tooling setups so that users can get started with actual plugin code as fast as possible. However, these templates are un-opinionated in terms of how you structure your plugin code and what libraries you use in addition to skpm.
>
> Current available official templates include:
>
> * [`skpm/skpm`](https://github.com/skpm/skpm/tree/master/template) - The simplest possible plugin setup. (_default_)
>
> * [`skpm/with-prettier`](https://github.com/skpm/with-prettier) - A plugin setup featuring linting with ESLint and code formatting with Prettier.
>
> > 💁 Tip: Any Github repo with a 'template' folder can be used as a custom template:
> > `skpm create <project-name> --template=<username>/<repository>`

#### Build the plugin

Once the installation is done, you can run some commands inside the project folder:

```bash
npm run build
```

To watch for changes:

```bash
npm run watch
```

Additionally, if you wish to run the plugin every time it is built:

```bash
npm run start
```

#### View the plugin's log

To view the output of your `console.log`, you have a few different options:

* Use the [`sketch-dev-tools`](https://github.com/skpm/sketch-dev-tools)
* Open `Console.app` and look for the sketch logs
* Look at the `~/Library/Logs/com.bohemiancoding.sketch3/Plugin Output.log` file

Skpm provides a convenient way to do the latter:

```bash
skpm log

  -f, -F        The `-f` option causes tail to not stop when end of file is
                reached, but rather to wait for additional data to be appended
                to the input.                       [boolean] [default: "false"]
  --number, -n  Shows `number` lines of the logs.                       [number]
```

#### Publish the plugin on the registry

To publish a new version of the plugin to the registry:

```bash
skpm publish <new-version> | major | minor | patch | premajor | preminor | prepatch | prerelease

  --repo-url          Specify the repository URL (default to the one specified
                      in package.json).                                 [string]
  --skip-release      Do not create a release on GitHub.com.           [boolean]
  --open-release, -o  Open the newly created release on GitHub.com.    [boolean]
  --skip-registry     Do not publish to the plugins registry if not already
                      present.                                         [boolean]
  --download-url      Specify the new version's download URL (default to the
                      asset of the release created on GitHub.com).      [string]
```

The exact order of execution (without options) is as follows:

* Run the `preversion` script
* Bump `version` in package.json as requested (`patch`, `minor`, `major`, etc).
* Run the `version` script
* Commit and tag
* Run the `postversion` script.
* Run the `prepublish` or `build` script
* Zip the folder specified in the `main` field
* Create a draft release on GitHub
* Upload the zip to GitHub
* Publish the release
* Remove the zip
* Check the [sketchplugins/plugin-directory](https://github.com/sketchplugins/plugin-directory) repo to see if the plugin is already there. If not, open a PR to add it.

## License

[MIT](https://tldrlegal.com/license/mit-license)

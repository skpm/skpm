# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [`Unreleased` - YYYY-MM-DD](https://github.com/sketch-pm/skpm/compare/v0.8.0...master)

### Added

### Changed

### Fixed

## [`v0.8.2` - 2017-04-20](https://github.com/sketch-pm/skpm/compare/v0.8.1...v0.8.2)

### Fixed
* fix a bug with the new .babelrc parsing - if a skpm project doesn't have a .babelrc and a parent directory does, babel-loader tries to use the parent .babelrc file.

## [`v0.8.1` - 2017-04-18](https://github.com/sketch-pm/skpm/compare/v0.8.0...v0.8.1)

### Added
* option to specify which repo to use with `skpm publish`
* option to not bump the version with `skpm publish`

### Fixed
* fix uploading the zip asset when using `skpm publish`

## [`v0.8.0` - 2017-04-07](https://github.com/sketch-pm/skpm/compare/a49b67f0f2cf7f13c750660e8116a3609cb89f67...v0.8.0)

### Added
* add babel-preset-airbnb by default
* add `.sketch.js,.js` resolve stack in webpack config
* add `--run` flag to `build` command to run the command once built

### Changed
* Swicth from `rollup` to `webpack` to build plugins
* Use `object-assign` instead of `Object.assign` to increase node support
* exit process when user webpack config can't be read

### Fixed
* fix lint everywhere and run `standard` on travis

## [`v0.7.4` - 2017-04-07](https://github.com/sketch-pm/skpm/compare/a49b67f0f2cf7f13c750660e8116a3609cb89f67...8e62f46caf7bba4b8a74c247f6331cc5b2c05d6c)

### Added
* Added a description on every command

### Changed
* Lazy require `keytar` to improve npm install time drastically. (It's only used when publishing a plugin)

## [`v0.7.4` - 2017-04-07](https://github.com/sketch-pm/skpm/compare/a49b67f0f2cf7f13c750660e8116a3609cb89f67...8e62f46caf7bba4b8a74c247f6331cc5b2c05d6c)

### Added
* Added a description on every command

### Changed
* Lazy require `keytar` to improve npm install time drastically. (It's only used when publishing a plugin)

## [`v0.7.3` - 2017-04-06](https://github.com/sketch-pm/skpm/compare/776276a04af6d8fe73d3ba40b8c6be53f757c2d4...a49b67f0f2cf7f13c750660e8116a3609cb89f67)

### Fixed
* fix resources build

## [`v0.7.2` - 2017-04-04](https://github.com/sketch-pm/skpm/compare/9dad9cb295d89f60708b771a9113e485a18c2946...776276a04af6d8fe73d3ba40b8c6be53f757c2d4)

### Fixed
* fix building when using `module.exports`

## [`v0.7.1` - 2017-04-04](https://github.com/sketch-pm/skpm/compare/644b79f2623187a28d807588d2816ad60a2caa77...9dad9cb295d89f60708b771a9113e485a18c2946)

### Added
* allow to export multiple functions per command

### Changed
* deduplicate command files

## [`v0.7.0` - 2017-04-03](https://github.com/sketch-pm/skpm/compare/170ef0aba1b16bf39c2f00b8ab39dd71ef2ce34c...644b79f2623187a28d807588d2816ad60a2caa77)

### Added
* Warning when failing to parse user's rollup config

### Changed
* exclude node-modules from babel loader by default

## [`v0.6.2` - 2017-04-03](https://github.com/sketch-pm/skpm/compare/740e0a4fc7c2265fc0743b268565408c94abc6d5...170ef0aba1b16bf39c2f00b8ab39dd71ef2ce34c)

### Changed
* Merge rollup plugins config instead of just overwrite it

## [`v0.6.1` - 2017-03-28](https://github.com/sketch-pm/skpm/compare/8fb585ef53b30b37791ff12a1358551a09051088...740e0a4fc7c2265fc0743b268565408c94abc6d5)

### Fixed
* Fixed dependencies not being merged in template init

## [`v0.6.0` - 2017-03-25](https://github.com/sketch-pm/skpm/compare/18b4913e39f5a05667af009f3eb18416e2a6e271...8fb585ef53b30b37791ff12a1358551a09051088)

### Added
* Support for scaffolding a new plugin based on a template published on npm or github: `skpm init template-name`. It will download the package, copy its content and merge the `package.json`

## [`v0.5.7` - 2017-03-25](https://github.com/sketch-pm/skpm/compare/0cda0c82debae8966d303c71eb30fc5aab4724fd...18b4913e39f5a05667af009f3eb18416e2a6e271)

### Added
* Support user defined rollup config by creating a `rollup.config.js` file next the `package.json`

## [`v0.5.6` - 2017-03-24](https://github.com/sketch-pm/skpm/compare/f99f0d6fb1de88c689e18c10c8f9d564208d5a19...0cda0c82debae8966d303c71eb30fc5aab4724fd)

### Changed
* show a clearer error message when a plugin has already been linked

## [`v0.5.6` - 2017-03-24](https://github.com/sketch-pm/skpm/compare/f99f0d6fb1de88c689e18c10c8f9d564208d5a19...0cda0c82debae8966d303c71eb30fc5aab4724fd)

### Changed
* show a clearer error message when a plugin has already been linked

## [`v0.5.5` - 2017-02-24](https://github.com/sketch-pm/skpm/compare/5521d18173b92e3e63f8db24899e67c98a060e97...f99f0d6fb1de88c689e18c10c8f9d564208d5a19)

### Fixed
* fix path to `.sketchplugin/Contents` in scaffolded `.gitignore`

## [`v0.5.4` - 2017-02-24](https://github.com/sketch-pm/skpm/compare/061f7ef56dae389bc7da485d70fc4b6d039166a8...5521d18173b92e3e63f8db24899e67c98a060e97)

### Changed
* fix link to `sketch dev mode` doc

## [`v0.5.3` - 2017-02-21](https://github.com/sketch-pm/skpm/compare/3d2cdc85623a1f2137a0f724525b6c791e6b4fe9...061f7ef56dae389bc7da485d70fc4b6d039166a8)

### Added
* Ask wether the user wants to enable the `sketch dev mode` when linking a plugin

### Changed
* In no path is given, default to current folder for the `link` command

## [`v0.5.2` - 2017-02-20](https://github.com/sketch-pm/skpm/compare/30fd1a8330b8ac81192bc43924d38d5ec7ca8f47...3d2cdc85623a1f2137a0f724525b6c791e6b4fe9)

### Fixed
* fix typoc in how the absolute path is handled in `link` command

## [`v0.5.1` - 2017-02-20](https://github.com/sketch-pm/skpm/compare/404022bc387dc400d3082af7b8f9c6c19d7f8b55...30fd1a8330b8ac81192bc43924d38d5ec7ca8f47)

### Changed
* handle absolute path in `link` command

## [`v0.5.0` - 2017-02-06](https://github.com/sketch-pm/skpm/compare/4b0fb88f8e25bba0787e5d8d1201e4670db3c090...404022bc387dc400d3082af7b8f9c6c19d7f8b55)

### Changed
* only transform `module.exports` to `var onRun` in commands, not dependencies

### Fixed
* fix typo in `link` command

## [`v0.4.10` - 2017-02-06](https://github.com/sketch-pm/skpm/compare/0c6e55244a788c2109675a605ecf0ad2a89aa6be...4b0fb88f8e25bba0787e5d8d1201e4670db3c090)

### Fixed
* fix unescaped string in the scaffolded plugin

## [`v0.4.9` - 2017-01-29](https://github.com/sketch-pm/skpm/compare/58447fd412034b1fc141e8d6b32bdda60b7d9f2c...56f6ced5a0d6ed47907cf58d76b78bf49a7dece4)

### Changed
* Update rollup

## [`v0.4.8` - 2017-01-26](https://github.com/sketch-pm/skpm/compare/0c6e55244a788c2109675a605ecf0ad2a89aa6be...58447fd412034b1fc141e8d6b32bdda60b7d9f2c)

### Changed
* warn trying the link the sketch plugin folder

### Fixed
* mkdir .sketchplugin/Contents if doesn't exist

## [`v0.4.7` - 2017-01-24](https://github.com/sketch-pm/skpm/compare/87683653631978c36df37e850e8b370b65114745...0c6e55244a788c2109675a605ecf0ad2a89aa6be)

### Fixed
* fix unescaped string in the scaffolded plugin

## [`v0.4.6` - 2017-01-10](https://github.com/sketch-pm/skpm/compare/b32adc14d9570688f794a9411963d632c4554685...87683653631978c36df37e850e8b370b65114745)

### Fixed
* fix name of uploaded asset on github

## [`v0.4.5` - 2017-01-08](https://github.com/sketch-pm/skpm/compare/98338cac396c1aa28e1498d6be380fadc704e99e...b32adc14d9570688f794a9411963d632c4554685)

### Added
* Allow to specify some `resources` in packages.json to build and copy them in the bundle

## [`v0.4.4` - 2017-01-03](https://github.com/sketch-pm/skpm/compare/73ec33620321fc77aad53e3c2943c4d8d7e46fce...98338cac396c1aa28e1498d6be380fadc704e99e)

### Fixed
* Fix a mistyped plugin field
* Fix wrong order of arguments of the `fs.symlink` function

## [`v0.4.3` - 2017-01-02](https://github.com/sketch-pm/skpm/compare/7b135e1dc5a1435ff9e2834e67772c13beda9c21...73ec33620321fc77aad53e3c2943c4d8d7e46fce)

### Added
* Added an option to open github in a browser once the release is created
* setup `update-notifier`

## [`v0.4.2` - 2017-01-02](https://github.com/sketch-pm/skpm/compare/9284c33e986fcd39d5e669953edf0552bb265ac6...7b135e1dc5a1435ff9e2834e67772c13beda9c21)

### Changed
* Avoid hardcoding constants and allow to specify a custom config in a `skpmrc` file

## [`v0.4.1` - 2016-12-29](https://github.com/sketch-pm/skpm/compare/5ebcb8590b2a196575b4e67b0f9bed381335bedc...9284c33e986fcd39d5e669953edf0552bb265ac6)

### Changed
* Update all the printing of the cli (inspired by the yarn output)
* Use `standard` as a linter

## [`v0.4.0` - 2016-12-29](https://github.com/sketch-pm/skpm/compare/71b1a674eadac71708ce01c4915b89eefd02eb04...5ebcb8590b2a196575b4e67b0f9bed381335bedc)

### Added
* `init` command to scaffold a new plugin
* `search` command to search the skpm registry for existing plugins

### Changed
* Do not publish to the registry when `private` is set in the `package.json` of the plugin

## [`v0.3.0` - 2016-12-22](https://github.com/sketch-pm/skpm/compare/e9eab0b963304eaebcf4de3d4fdf1dc35e3bdc95...71b1a674eadac71708ce01c4915b89eefd02eb04)

### Added
* `install` command to fetch and install a plugin from the registry
* `uninstall` command to remove a plugin from the sketch plugins folder
* Option on the `publish` command not to publish to the registry (only creates a github release)

### Changed
* Move the repo from `mathieudutour` to `sketch-pm`

## [`v0.2.1` - 2016-12-10](https://github.com/sketch-pm/skpm/compare/03083fb3caadd933557eb767cf0772ff0731fa9b...e9eab0b963304eaebcf4de3d4fdf1dc35e3bdc95)

### Added
* Polyfill `console` by default

### Changed
* Change the name from `sketch-builder` to `skpm`
* Disable the cocoascript preprocessor by default

## [`v0.2.0` - 2016-12-01](https://github.com/sketch-pm/skpm/compare/943f3cadb308c67a8162a337cc89c89c7628d430...03083fb3caadd933557eb767cf0772ff0731fa9b)

### Added
* Add ability to publish a plugin to the skpm registry

## [`v0.1.1` - 2016-11-25](https://github.com/sketch-pm/skpm/compare/85b0f4b39fd061fcf0a585632e53dd0f63094769...943f3cadb308c67a8162a337cc89c89c7628d430)

### Fixed
* create output folder if doesn't exist

## [`v0.1.0` - 2016-11-23](https://github.com/sketch-pm/skpm/commit/85b0f4b39fd061fcf0a585632e53dd0f63094769)

First release!

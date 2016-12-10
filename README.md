# Sketch Plugin Manager

A utility to build, publish and install sketch plugins.

<img align="center" src="screencast.gif">

## Why?

> Sketch Plugins are made possible by CocoaScript, a bridge that lets you use Objective-C/Cocoa code from an external script written in JavaScript. The bridge takes care of the translation between JavaScript and Cocoa.

This is great.

> You can use two different styles when writing your scripts: dot notation and bracket notation. Which means that you can use `var l = a.length()` as well as `var l = [a length]`.

Ok, well I guess it could be useful for Objective-C devs (even though Swift look a lot more like JavaScript than good old Obj-c). Unfortunately, if you use the bracket notation, you won't be able to use any kind of javascript linter :sad:

> To import functions defined in another file, you can use the syntax `@import 'my-shared-file.cocoascript'`

Wait, what? Do I really need to give up on explicit dependency injection? Do I really need to give up on the npm ecosystem? Do I really need to use a non-JavaScript syntax for that and break all linters?

> Oh, and you can't use `console.log`, you need to use `log`.

## Solution

Using a transpiler to build CocoaScript files from JavaScript files.

It means that you can:
  * write in in ES6+,
  * require any npm modules,
  * use your favorite linter (here is an [ESLint config for sketch](https://github.com/mathieudutour/eslint-config-sketch)),
  * use `console.log` (you're welcome).

Heck, you can even share sketch specific modules on npm ([here is one](https://github.com/mathieudutour/sketch-module-update) for example), no more copy/pasting from one project to another!

## How

You project needs to look like this:

```
/
  my-plugin.sketchplugin/
    Content/
      Resources/
        any-resource.png
  src/
    lib/
      any-shared-code.js
    commands/
      any-command.js
    manifest.json
  package.json
```

Install `sketch-build`:

```
npm i -D skpm
```

Add the following in your `package.json`:
```
"main": "my-plugin.sketchplugin",
"manifest": "src/manifest.json",
"scripts": {
  "build": "skpm build",
  "publish": "skpm publish"
}
```

You probably want to add this line to your `.gitignore`:
```
my-plugin.sketchplugin/Contents/Sketch
```

## Example

See a real life example here: https://github.com/mathieudutour/git-sketch-plugin

# Adding Assets

If your plugin needs assets like images, PDF or Sketch documents, you can add that as part of the `build` script in `package.json`. Here is one way to do it:

1. Place your assets in a directory `assets` at the root of your plugin repository (i.e. side by side with `src`).
2. Make a `post_build.sh` script that copies the contents of the `assets` directory to `Contents/Resources/` in the built `.sketchplugin` package, _with the directory structure intact_.
3. Call this script from the `build` script of `package.json`.

Here's a `post_build.sh` script that does the copying:

```sh
#!/usr/bin/env bash

PLUGIN_DIR=$(node << EOF
    dict = $(<package.json);
    console.log(dict.skpm.main);
EOF
)
ASSETS_SRC_DIR='assets'
RESOURCES_BUILD_DIR="${PLUGIN_DIR}/Contents/Resources/"

mkdir -p ${RESOURCES_BUILD_DIR}
cp -a "${ASSETS_SRC_DIR}"/* ${RESOURCES_BUILD_DIR}
```

Make sure to make it executable:

```sh
$ chmod +x post_build.sh
```

Make the `build` script in `package.json` do the post build task like so:

```js
  "scripts": {
    "build": "skpm-build && ./post_build.sh",
```

Now every time `skpm` builds your plugin (`npm run build` etcetera), anything that's in the `assets/` directory will be mirrored in `Contents/Resources/`, which means it can be used by your plugin.

### NB

* Name your subdirectories and files carefully so that you do not overwrite any resources built by your `webpack.skpm.config.js`.
* Make sure to update `.gitignore` to exclude the assets copied to the `.sketchplugin`. (Easiest fix is to ignore the whole `.sketchplugin` directory).

# skpm Test Runner 🏃🏽

Introducing Sketch Plugin Testing

* **👩🏻‍💻 Easy Setup**: `skpm-test` is a complete and easy to set up Sketch Plugin testing solution. In fact, `skpm-test` works out of the box for any `skpm` project.

## Installation

_`@skpm/test-runner` requires Sketch 49 or higher._

```bash
npm install --save-dev @skpm/test-runner
```

## Getting Started

Let's get started by writing a test for a hypothetical function that adds two numbers. First, create a `sum.js` file:

```javascript
function sum(context) {
  return a + b;
}
exports default sum;
```

Then, create a file named `sum.test.js`. This will contain our actual test:

```javascript
const sum = require('./sum')

test('adds 1 + 2 to equal 3', (context, document) => {
  expect(sum(1, 2)).toBe(3)
})
```

Add the following section to your `package.json`:

```json
{
  "scripts": {
    "test": "skpm-test"
  }
}
```

Finally, run `npm test` and `skpm-test` will print this message:

```
PASS  ./sum.test.js
```

**You just successfully wrote your first test that ran in Sketch using `skpm-test`!**

This test used `expect` and `toBe` to test that two values were exactly identical. To learn about the other things that `skpm-test` can test, see [Using Matchers](https://facebook.github.io/jest/docs/en/using-matchers.html).

## Running the tests on TravisCI

* Go to [Travis](https://travis-ci.org/profile)
* Add your repo
* In the settings, add an environment variable called `SKETCH_LICENSE` with your sketch license
* Copy paste the following code in a new file named `.travis.yml`

  ```yaml
  os: osx

  language: node_js

  node_js:
    - "node"

  before_install:
    - brew update
    - brew cask install sketch # install Sketch
    - mkdir -p "~/Library/Application Support/com.bohemiancoding.sketch3" # create support folder
    - mkdir -p "~/Library/Application Support/com.bohemiancoding.sketch3/Plugins" # create plugins folder
    - echo $SKETCH_LICENSE > "~/Library/Application Support/com.bohemiancoding.sketch3/.deployment" # add the Sketch license

  cache:
    directories:
      - "node_modules"
      - $HOME/Library/Caches/Homebrew

  script:
    - npm run test

  after_script:
    - rm "~/Library/App Support/com.bohemiancoding.sketch3/.deployment" # remove the Sketch license
  ```

* Commit, Push, done!

## Contributing

Send issues and pull requests with your ideas.

[Good First Issue](https://github.com/skpm/skpm/issues?q=is%3Aopen+label%3A%22good+first+issue%22+label%3Atester) is a great starting point for PRs.

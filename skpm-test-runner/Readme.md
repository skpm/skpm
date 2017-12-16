# skpm Test Runner 🏃🏽

_⚠️ This is an alpha version that only works with the new [Sketch API](https://github.com/BohemianCoding/SketchAPI) (not released yet)_

Introducing Sketch Plugin Testing

- **👩🏻‍💻 Easy Setup**: `skpm-test` is a complete and easy to set up Sketch Plugin testing solution. In fact, `skpm-test` works out of the box for any `skpm` project.

## Getting Started

Install `skpm-test` using `npm`:

```
npm install --save-dev @skpm/test-runner
```

Let's get started by writing a test for a hypothetical function that adds two numbers. First, create a `sum.js` file:

```javascript
function sum(context) {
  return a + b;
}
exports default sum;
```

Then, create a file named `sum.test.js`. This will contain our actual test:

```javascript
const sum = require('./sum');

test('adds 1 + 2 to equal 3', (context, document) => {
  expect(sum(1, 2)).toBe(3);
});
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

## Contributing

Send issues and pull requests with your ideas.

[Good First Issue](https://github.com/skpm/skpm/issues?q=is%3Aopen+label%3A%22good+first+issue%22+label%3Atester) is a great starting point for PRs.

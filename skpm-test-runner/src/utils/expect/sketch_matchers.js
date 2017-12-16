// /* Sketch specific matchers */
// toBeNative(expected, msg) {
//   try {
//     if (String(this.actual.class()) !== expected) {
//       fail(this.actual, expected, msg, 'toBeNative')
//     }
//   } catch (err) {
//     fail(this.actual, expected, err.message, 'toBeNative')
//   }
// }

// toWrap(expected, msg) {
//   try {
//     if (this.actual.sketchObject !== expected) {
//       fail(this.actual, expected, msg, 'toBe')
//     }
//   } catch (err) {
//     fail(this.actual, expected, err.message, 'toBe')
//   }
// }

// toWrapSameAs(expected, msg) {
//   try {
//     if (this.actual.sketchObject !== expected) {
//       fail(this.actual, expected, msg, 'toBe')
//     }
//   } catch (err) {
//     fail(this.actual, expected, err.message, 'toBe')
//   }
// }

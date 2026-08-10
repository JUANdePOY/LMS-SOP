const { toCorrectAnswerArray } = require('./utils/_bulkcopy.js');
console.log('typeof func:', typeof toCorrectAnswerArray);
if (typeof toCorrectAnswerArray === 'function') {
  console.log('pipe result:', JSON.stringify(toCorrectAnswerArray('2|3|5')));
}

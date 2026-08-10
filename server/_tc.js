const { toCorrectAnswerArray } = require('./utils/bulkImportValidation');
console.log('pipe:', JSON.stringify(toCorrectAnswerArray('2|3|5')));
console.log('arr:', JSON.stringify(toCorrectAnswerArray(['2','3','5'])));
console.log('single:', JSON.stringify(toCorrectAnswerArray('2')));

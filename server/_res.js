console.log('RESOLVED:', require.resolve('./utils/bulkImportValidation'));
const m = require('./utils/bulkImportValidation');
console.log('keys:', Object.keys(m));
console.log('normalizeQuestion src:', m.normalizeQuestion.toString().slice(0, 120));

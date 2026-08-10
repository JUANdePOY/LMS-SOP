const fs = require('fs');
const lines = fs.readFileSync('./utils/bulkImportValidation.js', 'utf8').split('\n');
console.log('LINE 48:', JSON.stringify(lines[47]));
console.log('LINE 49:', JSON.stringify(lines[48]));
console.log('LINE 50:', JSON.stringify(lines[49]));

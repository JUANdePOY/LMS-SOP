const fs = require('fs');
const src = fs.readFileSync('./utils/_bulkcopy.js', 'utf8');
console.log('FIRST 60 CHARS HEX:', Buffer.from(src.slice(0, 60)).toString('hex').slice(0, 80));
const vm = require('vm');
const sandbox = {};
vm.runInNewContext(src + '\nthis.result = typeof toCorrectAnswerArray;', sandbox);
console.log('typeof toCorrectAnswerArray in vm:', sandbox.result);

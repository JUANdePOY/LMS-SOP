const fs = require('fs');
const code = fs.readFileSync('server/services/taskService.js', 'utf8');

const openBraces = (code.match(/{/g) || []).length;
const closeBraces = (code.match(/}/g) || []).length;
console.log('Open braces:', openBraces);
console.log('Close braces:', closeBraces);
console.log('Difference:', openBraces - closeBraces);

// Find lines with only opening or only closing braces
const lines = code.split('\n');
let braceCount = 0;
for (let l = 0; l < lines.length; l++) {
  const line = lines[l];
  const open = (line.match(/{/g) || []).length;
  const close = (line.match(/}/g) || []).length;
  if (open > 0 || close > 0) {
    console.log(`Line ${l + 1}: +${open} -${close} = ${braceCount + open - close} | ${line.substring(0, 60)}`);
  }
  braceCount += open - close;
}
console.log('Final balance:', braceCount);

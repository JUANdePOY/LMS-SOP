const fs = require('fs');
const code = fs.readFileSync('server/services/taskService.js', 'utf8');
const lines = code.split('\n');

let braceCount = 0;
for (let l = 0; l < lines.length; l++) {
  const line = lines[l];
  const open = (line.match(/{/g) || []).length;
  const close = (line.match(/}/g) || []).length;
  braceCount += open - close;
  if (braceCount !== 0) {
    console.log(`Line ${l + 1}: balance=${braceCount} | ${line.substring(0, 80)}`);
  }
}

console.log('Final balance:', braceCount);

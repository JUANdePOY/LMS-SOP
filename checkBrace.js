const fs = require('fs');
const code = fs.readFileSync('server/services/taskService.js', 'utf8');

let braceCount = 0;
let lineNum = 1;

for (let i = 0; i < code.length; i++) {
  if (code[i] === '\n') {
    lineNum++;
  }
  if (code[i] === '{') {
    braceCount++;
  }
  if (code[i] === '}') {
    braceCount--;
  }
}

console.log('Final brace balance:', braceCount);
console.log('Total lines:', lineNum);

// Now find the last place where braceCount was 0
braceCount = 0;
let lastZeroLine = 0;
let maxBrace = 0;

for (let i = 0; i < code.length; i++) {
  if (code[i] === '\n') {
    lineNum++;
  }
  if (code[i] === '{') {
    braceCount++;
    if (braceCount > maxBrace) maxBrace = braceCount;
  }
  if (code[i] === '}') {
    braceCount--;
  }
  if (braceCount === 0) {
    lastZeroLine = lineNum;
  }
}

console.log('Last line where braces were balanced:', lastZeroLine);
console.log('Max brace depth:', maxBrace);

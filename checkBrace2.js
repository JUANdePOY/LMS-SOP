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
  if (braceCount < 0) {
    console.log('Negative brace count at line', lineNum);
    break;
  }
}

console.log('Final brace balance:', braceCount);
console.log('Last line:', lineNum);

// Find where brace count first becomes positive and stays positive
braceCount = 0;
let firstPositiveLine = 0;

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
  if (braceCount > 0 && firstPositiveLine === 0) {
    firstPositiveLine = lineNum;
  }
}

console.log('First line where brace count became positive:', firstPositiveLine);

// Let's also check for unclosed braces by looking at each line
braceCount = 0;
lineNum = 1;
const lines = code.split('\n');

for (let l = 0; l < lines.length; l++) {
  const line = lines[l];
  for (let c = 0; c < line.length; c++) {
    if (line[c] === '{') braceCount++;
    if (line[c] === '}') braceCount--;
  }
  if (braceCount > 0 && firstPositiveLine === 0) {
    firstPositiveLine = l + 1;
  }
}

console.log('Using split - First positive brace line:', firstPositiveLine);
console.log('Using split - Final balance:', braceCount);
console.log('Total lines:', lines.length);

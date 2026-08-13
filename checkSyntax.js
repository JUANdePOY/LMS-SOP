const fs = require('fs');
const code = fs.readFileSync('server/services/taskService.js', 'utf8');

// Check backticks
const backticks = code.match(/`/g);
console.log('backticks count:', backticks ? backticks.length : 0);

// Check for unclosed template literals by looking for backtick pairs
let inTemplate = false;
for (let i = 0; i < code.length; i++) {
  if (code[i] === '`') {
    inTemplate = !inTemplate;
  }
}
console.log('in template literal at EOF:', inTemplate);

// Check braces
let braceCount = 0;
for (let i = 0; i < code.length; i++) {
  if (code[i] === '{') braceCount++;
  if (code[i] === '}') braceCount--;
}
console.log('brace balance:', braceCount);

// Check parentheses
let parenCount = 0;
for (let i = 0; i < code.length; i++) {
  if (code[i] === '(') parenCount++;
  if (code[i] === ')') parenCount--;
}
console.log('paren balance:', parenCount);

// Check brackets
let bracketCount = 0;
for (let i = 0; i < code.length; i++) {
  if (code[i] === '[') bracketCount++;
  if (code[i] === ']') bracketCount--;
}
console.log('bracket balance:', bracketCount);

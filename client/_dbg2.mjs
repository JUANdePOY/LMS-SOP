import { parseCsv, validateBulkImport } from "./_bulk_test.mjs";
// Re-import internals not exported; instead test VALID_TYPES indirectly:
const csv = `question_text,type,options,correct_answer,points
"Select primes.","multiple_select","2|3|4|5","2|3|5",3`;
const p = parseCsv(csv);
// Patch: check if VALID_TYPES includes
console.log("type bytes:", [...p[0].type].map(c=>c.charCodeAt(0)).join(","));
console.log("type length:", p[0].type.length);

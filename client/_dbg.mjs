import { parseCsv, validateBulkImport } from "./_bulk_test.mjs";
const csv = `question_text,type,options,correct_answer,points
"Select primes.","multiple_select","2|3|4|5","2|3|5",3`;
const p = parseCsv(csv);
console.log("parsed type:", JSON.stringify(p[0].type));
const res = validateBulkImport(p);
console.log("valid type:", JSON.stringify(res.valid[0]?.type));
console.log("valid correct_answer:", JSON.stringify(res.valid[0]?.correct_answer));
console.log("invalid errors:", JSON.stringify(res.invalid[0]?.errors));

import { parseCsv, validateBulkImport } from "./_bulk_test.mjs";

const csv = `question_text,type,options,correct_answer,points,explanation
"Select prime numbers.","multiple_select","2|3|4|5","2|3|5",3,"2,3,5 are prime."`;

const parsed = parseCsv(csv);
const res = validateBulkImport(parsed);
console.log("VALID correct_answer:", JSON.stringify(res.valid[0]?.correct_answer));
console.log("VALID options:", JSON.stringify(res.valid[0]?.options));
console.log("INVALID:", JSON.stringify(res.invalid));

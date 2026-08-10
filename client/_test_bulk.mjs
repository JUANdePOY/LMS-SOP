import { parseCsv, normalizeQuestion, validateBulkImport } from "./src/features/assessments/utils/bulkImportValidation.js";

const csv = `question_text,type,options,correct_answer,points,explanation
"Select prime numbers.","multiple_select","2|3|4|5","2|3|5",3,"2,3,5 are prime."
"The Earth is round.","true_false","","true",1,"fact"`;

const parsed = parseCsv(csv);
console.log("PARSED:", JSON.stringify(parsed, null, 2));
const norm = parsed.map((q, i) => normalizeQuestion(q, i));
console.log("NORMALIZED:", JSON.stringify(norm, null, 2));
const res = validateBulkImport(parsed);
console.log("VALID:", JSON.stringify(res.valid, null, 2));
console.log("INVALID:", JSON.stringify(res.invalid, null, 2));

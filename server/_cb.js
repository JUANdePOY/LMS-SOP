const m = require('./utils/bulkImportValidation.js?cb=' + Date.now());
const q = m.normalizeQuestion({ type: 'multiple_select', question_text: 'x', options: ['2','3','4','5'], correct_answer: '2|3|5' }, 0);
console.log('RESULT:', typeof q.correct_answer, Array.isArray(q.correct_answer), JSON.stringify(q.correct_answer));

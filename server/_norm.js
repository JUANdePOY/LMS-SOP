const { normalizeQuestion } = require('./utils/bulkImportValidation');
const q = normalizeQuestion({ type: 'multiple_select', question_text: 'x', options: ['2','3','4','5'], correct_answer: '2|3|5' }, 0);
console.log('typeof:', typeof q.correct_answer, 'isArray:', Array.isArray(q.correct_answer), 'value:', JSON.stringify(q.correct_answer));

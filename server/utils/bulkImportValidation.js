const VALID_TYPES = new Set(['multiple_choice', 'multiple_select', 'true_false', 'short_answer']);

function normalizeText(val) {
  return typeof val === 'string' ? val.trim() : val;
}

function parseOptions(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return val.split('|').map((s) => normalizeText(s)).filter(Boolean);
    }
  }
  return val;
}

function toCorrectAnswerArray(val) {
  if (Array.isArray(val)) return val.map((v) => String(v).trim()).filter(Boolean);
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
    } catch {
      /* not JSON, fall through to pipe split */
    }
    return val.split('|').map((v) => v.trim()).filter(Boolean);
  }
  return val == null ? [] : [String(val).trim()].filter(Boolean);
}

function normalizeQuestion(q, idx) {
  const type = normalizeText(q.type || q.question_type || '');
  const question_text = normalizeText(q.question_text || q.question || '');
  const options = parseOptions(q.options);

  let normalizedOptions = Array.isArray(options) && options.length ? options : null;
  let correct_answer = q.correct_answer != null ? q.correct_answer : q.correctAnswer;

  if (type === 'true_false') {
    if (!normalizedOptions) normalizedOptions = ['True', 'False'];
    const raw = correct_answer != null ? String(correct_answer).trim().toLowerCase() : null;
    if (raw === 'true') correct_answer = 'True';
    else if (raw === 'false') correct_answer = 'False';
    else correct_answer = null;
  } else if (type === 'multiple_select' || type === 'multi_select') {
    correct_answer = toCorrectAnswerArray(correct_answer || []);
  }

  const points = q.points != null ? Number(q.points) : 1;

  return {
    type,
    question_text,
    options: normalizedOptions,
    correct_answer,
    points: Number.isFinite(points) && points > 0 ? points : 1,
    order_index: q.order_index != null ? Number(q.order_index) : idx,
    row: idx,
  };
}

function validateQuestion(q, idx, existingQuestions = []) {
  const errors = [];
  const row = idx + 1;

  if (!q.question_text) {
    errors.push({ row, field: 'question_text', message: 'Question text is required' });
  }

  if (!q.type) {
    errors.push({ row, field: 'type', message: 'Question type is required' });
  } else if (!VALID_TYPES.has(q.type)) {
    errors.push({ row, field: 'type', message: `Invalid type "${q.type}". Must be one of: ${Array.from(VALID_TYPES).join(', ')}` });
  }

  if (q.type === 'multiple_choice' || q.type === 'multiple_select') {
    if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
      errors.push({ row, field: 'options', message: 'At least two options are required for multiple choice/select questions' });
    }
    if (q.correct_answer == null || q.correct_answer === '') {
      errors.push({ row, field: 'correct_answer', message: 'Correct answer is required' });
    } else if (q.type === 'multiple_choice' && q.options) {
      const opts = q.options.map((o) => String(o).trim());
      if (!opts.includes(String(q.correct_answer).trim())) {
        errors.push({ row, field: 'correct_answer', message: `Correct answer "${q.correct_answer}" is not among the options` });
      }
    }
    if (q.type === 'multiple_select') {
      if (!Array.isArray(q.correct_answer) || q.correct_answer.length === 0) {
        errors.push({ row, field: 'correct_answer', message: 'At least one correct answer is required for multiple select' });
      } else if (q.options) {
        const opts = q.options.map((o) => String(o).trim());
        for (const ans of q.correct_answer) {
          if (!opts.includes(String(ans).trim())) {
            errors.push({ row, field: 'correct_answer', message: `Correct answer "${ans}" is not among the options` });
          }
        }
      }
    }
  }

  if (q.type === 'true_false') {
    if (q.correct_answer != null && q.correct_answer !== '' && !['true', 'false'].includes(String(q.correct_answer).toLowerCase())) {
      errors.push({ row, field: 'correct_answer', message: 'True/False answer must be "true" or "false"' });
    }
  }

  if (q.points != null && (isNaN(q.points) || q.points < 1)) {
    errors.push({ row, field: 'points', message: 'Points must be a positive number' });
  }

  // Duplicate detection against existing questions
  const existing = existingQuestions.find(
    (existingQ) =>
      existingQ.type === q.type &&
      existingQ.question_text === q.question_text &&
      JSON.stringify(existingQ.options) === JSON.stringify(q.options)
  );
  if (existing) {
    errors.push({ row, field: 'duplicate', message: 'This question already exists in the quiz' });
  }

  return errors;
}

function validateBulkImport(questions, existingQuestions = []) {
  const normalized = questions.map((q, idx) => normalizeQuestion(q, idx));
  const allErrors = [];
  const valid = [];
  const invalid = [];

  for (const q of normalized) {
    const errors = validateQuestion(q, q.row - 1, existingQuestions);
    if (errors.length > 0) {
      allErrors.push(...errors);
      invalid.push({ question: q, errors });
    } else {
      valid.push(q);
    }
  }

  return {
    valid,
    invalid,
    errors: allErrors,
    summary: {
      total: questions.length,
      valid: valid.length,
      invalid: invalid.length,
    },
  };
}

module.exports = {
  VALID_TYPES,
  normalizeQuestion,
  validateQuestion,
  validateBulkImport,
};

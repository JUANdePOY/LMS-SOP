const QUESTION_TYPES = { MULTIPLE_CHOICE: "multiple_choice", MULTI_SELECT: "multi_select", TRUE_FALSE: "true_false", SHORT_ANSWER: "short_answer" };

const VALID_TYPES = new Set([
  QUESTION_TYPES.MULTIPLE_CHOICE,
  QUESTION_TYPES.MULTI_SELECT,
  QUESTION_TYPES.TRUE_FALSE,
  QUESTION_TYPES.SHORT_ANSWER,
]);

function normalizeText(val) {
  return typeof val === "string" ? val.trim() : val;
}

function parseOptions(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return val.split("|").map(normalizeText).filter(Boolean);
    }
  }
  return val;
}

// Split a correct-answer value into an array (used for multi-select). Accepts
// a JSON array, a pipe-delimited string, or a single value wrapped in an array.
function toCorrectAnswerArray(val) {
  if (Array.isArray(val)) return val.map((v) => String(v).trim()).filter(Boolean);
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
    } catch { /* not JSON, fall through to pipe split */ }
    return val.split("|").map((v) => v.trim()).filter(Boolean);
  }
  return val == null ? [] : [String(val).trim()].filter(Boolean);
}

export function normalizeQuestion(q, idx = 0) {
  const type = normalizeText(q.type || q.question_type || "");
  const question_text = normalizeText(q.question_text || q.question || "");
  const options = parseOptions(q.options);

  let normalizedOptions = Array.isArray(options) && options.length ? options : null;
  let correct_answer = q.correct_answer != null ? q.correct_answer : q.correctAnswer;

  if (type === "true_false") {
    // True/False has implicit, fixed options so they always display.
    if (!normalizedOptions) normalizedOptions = ["True", "False"];
    correct_answer = correct_answer != null ? String(correct_answer).trim().toLowerCase() : null;
    if (correct_answer && correct_answer !== "true" && correct_answer !== "false") {
      correct_answer = null;
    }
  } else if (type === "multi_select") {
    // Correct answer must be an array of option texts.
    correct_answer = toCorrectAnswerArray(correct_answer || []);
  }

  const points = q.points != null ? Number(q.points) : 1;

  return {
    type,
    question_text,
    options: normalizedOptions,
    correct_answer,
    points: Number.isFinite(points) && points > 0 ? Math.round(points) : 1,
    order_index: q.order_index != null ? Number(q.order_index) : idx,
    row: idx + 1,
  };
}

export function validateQuestion(q, existingQuestions = []) {
  const errors = [];

  if (!q.question_text) {
    errors.push({ row: q.row, field: "question_text", message: "Question text is required" });
  }

  if (!q.type) {
    errors.push({ row: q.row, field: "type", message: "Question type is required" });
  } else if (!VALID_TYPES.has(q.type)) {
    errors.push({ row: q.row, field: "type", message: `Invalid type "${q.type}". Must be one of: ${Array.from(VALID_TYPES).join(", ")}` });
  }

  if (q.type === "multiple_choice" || q.type === "multiple_select") {
    if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
      errors.push({ row: q.row, field: "options", message: "At least two options are required for multiple choice/select questions" });
    }
    if (q.correct_answer == null || q.correct_answer === "") {
      errors.push({ row: q.row, field: "correct_answer", message: "Correct answer is required" });
    } else if (q.type === "multiple_choice" && q.options) {
      const opts = q.options.map((o) => String(o).trim());
      if (!opts.includes(String(q.correct_answer).trim())) {
        errors.push({ row: q.row, field: "correct_answer", message: `Correct answer "${q.correct_answer}" is not among the options` });
      }
    }
    if (q.type === "multiple_select") {
      if (!Array.isArray(q.correct_answer) || q.correct_answer.length === 0) {
        errors.push({ row: q.row, field: "correct_answer", message: "At least one correct answer is required for multiple select" });
      } else if (q.options) {
        const opts = q.options.map((o) => String(o).trim());
        q.correct_answer.forEach((ans) => {
          if (!opts.includes(String(ans).trim())) {
            errors.push({ row: q.row, field: "correct_answer", message: `Correct answer "${ans}" is not among the options` });
          }
        });
      }
    }
  }

  if (q.type === "true_false") {
    if (q.correct_answer != null && q.correct_answer !== "" && !["true", "false"].includes(String(q.correct_answer).toLowerCase())) {
      errors.push({ row: q.row, field: "correct_answer", message: "True/False answer must be 'true' or 'false'" });
    }
  }

  if (q.points != null && (isNaN(q.points) || q.points < 1)) {
    errors.push({ row: q.row, field: "points", message: "Points must be a positive number" });
  }

  const existing = existingQuestions.find(
    (existingQ) =>
      existingQ.type === q.type &&
      existingQ.question_text === q.question_text &&
      JSON.stringify(existingQ.options) === JSON.stringify(q.options)
  );
  if (existing) {
    errors.push({ row: q.row, field: "duplicate", message: "This question already exists in the quiz" });
  }

  return errors;
}

export function validateBulkImport(questions, existingQuestions = []) {
  console.error("DEBUG VALID_TYPES has multiple_select:", VALID_TYPES.has("multiple_select"), "size:", VALID_TYPES.size);
  const normalized = questions.map((q, idx) => normalizeQuestion(q, idx));
  const allErrors = [];
  const valid = [];
  const invalid = [];

  normalized.forEach((q) => {
    const errors = validateQuestion(q, existingQuestions);
    if (errors.length > 0) {
      allErrors.push(...errors);
      invalid.push({ question: q, errors });
    } else {
      valid.push(q);
    }
  });

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

export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const colMap = {};
  headers.forEach((h, i) => {
    colMap[h.toLowerCase()] = i;
  });

  const questions = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const getText = (name) => {
      const idx = colMap[name];
      return idx != null ? cols[idx] : "";
    };

    const question_text = getText("question_text") || getText("question");
    const type = getText("type") || "multiple_choice";
    const optionsRaw = getText("options");
    const correctRaw = getText("correct_answer") || getText("correctAnswer");
    const points = getText("points");
    const explanation = getText("explanation");

    let options = [];
    if (optionsRaw) {
      try {
        const parsed = JSON.parse(optionsRaw);
        options = Array.isArray(parsed) ? parsed : [];
      } catch {
        options = optionsRaw.split("|").map((s) => s.trim()).filter(Boolean);
      }
    }

    let correct_answer = correctRaw;
    if (correctRaw) {
      try {
        correct_answer = JSON.parse(correctRaw);
      } catch {
        correct_answer = correctRaw;
      }
    }

    if (!question_text && !type) continue;

    questions.push({
      question_text,
      type,
      options: options.length ? options : null,
      correct_answer,
      points: points ? Number(points) : 1,
      explanation,
    });
  }
  return questions;
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export default { validateBulkImport, normalizeQuestion, parseCsv };

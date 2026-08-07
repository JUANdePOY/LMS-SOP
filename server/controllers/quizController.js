const quizModel = require('../models/quizModel');
const courseModel = require('../models/courseModel');
const quizHierarchyModel = require('../models/quizHierarchyModel');
const { logAudit } = require('../utils/auditLogger');

const ADMIN_ROLES = ['super_admin', 'admin', 'department_head'];
const FINAL_QUIZ_DEFAULT_ATTEMPTS = 3;

function sendError(res, err, fallback = 'Request failed') {
  const status = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : (err.status || 500);
  const code = err.code || 'INTERNAL_ERROR';
  if (status === 500) console.error('[QuizController Error]', err);
  return res.status(status).json({ success: false, message: err.message || fallback, code });
}

function parseCsvContent(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const colMap = {};
  headers.forEach((h, i) => { colMap[h.toLowerCase()] = i; });

  const questions = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const getText = (name) => {
      const idx = colMap[name];
      return idx != null ? cols[idx] : '';
    };

    const question_text = getText('question_text') || getText('question');
    const type = getText('type') || 'multiple_choice';
    const optionsRaw = getText('options');
    const correctRaw = getText('correct_answer') || getText('correctAnswer');
    const points = getText('points');
    const explanation = getText('explanation');

    let options = [];
    if (optionsRaw) {
      try {
        const parsed = JSON.parse(optionsRaw);
        options = Array.isArray(parsed) ? parsed : [];
      } catch {
        options = optionsRaw.split('|').map((s) => s.trim()).filter(Boolean);
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
  let current = '';
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
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

async function assertCanManageCourse(req, courseId) {
  const course = await courseModel.findById(courseId);
  if (!course) {
    const e = new Error('Course not found');
    e.statusCode = 404;
    throw e;
  }
  const { role, department_id } = req.user || {};
  if (role !== 'super_admin' && role !== 'admin' && role !== 'department_head') {
    const e = new Error('Insufficient permissions');
    e.statusCode = 403;
    throw e;
  }
  if (role !== 'super_admin' && course.department_id && String(course.department_id) !== String(department_id)) {
    const e = new Error('Not authorized for this course');
    e.statusCode = 403;
    throw e;
  }
}

function requireAdminRole(req, res, next) {
  const role = req.user?.role;
  if (!ADMIN_ROLES.includes(role)) {
    return res.status(403).json({ success: false, message: 'Admin role required', code: 'FORBIDDEN' });
  }
  next();
}

// ---------------------------------------------------------------------------
// Quizzes
// ---------------------------------------------------------------------------

async function listQuizzes(req, res) {
  const { courseId, moduleId, status, page, limit } = req.query;
  if (!courseId) return res.status(400).json({ success: false, message: 'courseId is required', code: 'VALIDATION_ERROR' });

  try {
    const quizzes = await quizModel.listQuizzes(courseId, { module_id: moduleId, status, page, limit });
    res.json({ success: true, data: quizzes });
  } catch (err) {
    sendError(res, err, 'Failed to list quizzes');
  }
}

async function listAllQuizzes(req, res) {
  const { search, status, quizType, page, limit } = req.query;
  try {
    const result = await quizModel.listAllQuizzes({
      search,
      status,
      quizType,
      page,
      limit,
    });
    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        total: result.total,
        totalPages: Math.ceil((result.total || 0) / (Number(limit) || 20)) || 1,
      },
    });
  } catch (err) {
    sendError(res, err, 'Failed to list quizzes');
  }
}

async function listMyQuizzes(req, res) {
  try {
    const courseId = req.query.courseId ? parseInt(req.query.courseId, 10) : null;
    const quizzes = await quizModel.getMyQuizzes(req.user.id, req.user.role, courseId);
    res.json({ success: true, data: quizzes });
  } catch (err) {
    sendError(res, err, 'Failed to list quizzes');
  }
}

async function getQuiz(req, res) {
  try {
    const quiz = await quizModel.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found', code: 'NOT_FOUND' });
    const questions = await quizModel.listQuestions(quiz.id);
    res.json({ success: true, data: { ...quiz, question_count: questions.length, questionsCount: questions.length } });
  } catch (err) {
    sendError(res, err, 'Failed to fetch quiz');
  }
}

async function createQuiz(req, res) {
  const { courseId, title, description, time_limit, max_score, attempts_allowed, passing_score, feedback_policy, status, quiz_type, randomize_questions, shuffle_options, grading_method } = req.body;

  if (!courseId || !title) {
    return res.status(400).json({ success: false, message: 'courseId and title are required', code: 'VALIDATION_ERROR' });
  }

  try {
    await assertCanManageCourse(req, courseId);

    const effectiveType = quiz_type || 'practice';
    const attempts = quiz_type === 'final' ? (attempts_allowed || FINAL_QUIZ_DEFAULT_ATTEMPTS) : (attempts_allowed || 1);

    const quizId = await quizModel.create({
      course_id: courseId,
      title,
      description,
      time_limit,
      max_score,
      attempts_allowed: attempts,
      passing_score,
      feedback_policy,
      status,
      quiz_type: effectiveType,
      randomize_questions,
      shuffle_options,
      grading_method,
    });

    logAudit && logAudit('quiz.create', req.user.id, { quizId, courseId });
    res.status(201).json({ success: true, data: { id: quizId }, message: 'Quiz created' });
  } catch (err) {
    sendError(res, err, 'Failed to create quiz');
  }
}

async function updateQuiz(req, res) {
  const { title, description, time_limit, max_score, attempts_allowed, passing_score, feedback_policy, status, quiz_type, randomize_questions, shuffle_options, grading_method } = req.body;

  try {
    const quiz = await quizModel.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found', code: 'NOT_FOUND' });
    await assertCanManageCourse(req, quiz.course_id);

    await quizModel.update(req.params.id, { title, description, time_limit, max_score, attempts_allowed, passing_score, feedback_policy, status, quiz_type, randomize_questions, shuffle_options, grading_method });
    logAudit && logAudit('quiz.update', req.user.id, { quizId: quiz.id });
    res.json({ success: true, message: 'Quiz updated' });
  } catch (err) {
    sendError(res, err, 'Failed to update quiz');
  }
}

async function deleteQuiz(req, res) {
  try {
    const force = req.query.force === 'true' || req.body?.force === true;
    // For a force delete the quiz may already be soft-deleted (e.g. its parent
    // course was removed, which cascades a soft delete onto the quiz). In that
    // case findById (which filters is_deleted) returns nothing, so look up the
    // row ignoring the soft-delete flag.
    const quiz = await (force
      ? quizModel.findByIdIgnoringDelete(req.params.id)
      : quizModel.findById(req.params.id));
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found', code: 'NOT_FOUND' });
    await assertCanManageCourse(req, quiz.course_id);
    if (force) {
      await quizModel.hardDelete(req.params.id);
    } else {
      await quizModel.softDelete(req.params.id);
    }
    logAudit && logAudit('quiz.delete', req.user.id, { quizId: quiz.id, forced: force });
    res.json({ success: true, message: 'Quiz deleted' });
  } catch (err) {
    sendError(res, err, 'Failed to delete quiz');
  }
}

async function publishQuiz(req, res) {
  try {
    const quiz = await quizModel.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found', code: 'NOT_FOUND' });
    await assertCanManageCourse(req, quiz.course_id);
    await quizModel.update(req.params.id, { status: 'published' });
    logAudit && logAudit('quiz.publish', req.user.id, { quizId: quiz.id });
    res.json({ success: true, message: 'Quiz published' });
  } catch (err) {
    sendError(res, err, 'Failed to publish quiz');
  }
}

async function archiveQuiz(req, res) {
  try {
    const quiz = await quizModel.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found', code: 'NOT_FOUND' });
    await assertCanManageCourse(req, quiz.course_id);
    await quizModel.update(req.params.id, { status: 'archived' });
    logAudit && logAudit('quiz.archive', req.user.id, { quizId: quiz.id });
    res.json({ success: true, message: 'Quiz archived' });
  } catch (err) {
    sendError(res, err, 'Failed to archive quiz');
  }
}

async function duplicateQuiz(req, res) {
  try {
    const quiz = await quizModel.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found', code: 'NOT_FOUND' });
    await assertCanManageCourse(req, quiz.course_id);

    const questions = await quizModel.listQuestions(quiz.id);
    const newId = await quizModel.create({
      course_id: quiz.course_id,
      module_id: quiz.module_id,
      title: `${quiz.title} (copy)`,
      description: quiz.description,
      time_limit: quiz.time_limit,
      max_score: quiz.max_score,
      attempts_allowed: quiz.attempts_allowed,
      passing_score: quiz.passing_score,
      feedback_policy: quiz.feedback_policy,
      status: 'draft',
      quiz_type: quiz.quiz_type,
      randomize_questions: quiz.randomize_questions,
      shuffle_options: quiz.shuffle_options,
      grading_method: quiz.grading_method,
    });

    for (const q of questions) {
      await quizModel.createQuestion({
        quiz_id: newId,
        type: q.type,
        question_text: q.question_text,
        options: q.options ? JSON.parse(q.options) : null,
        correct_answer: q.correct_answer ? JSON.parse(q.correct_answer) : null,
        points: q.points,
        order_index: q.order_index,
      });
    }

    logAudit && logAudit('quiz.duplicate', req.user.id, { quizId: quiz.id, newQuizId: newId });
    res.status(201).json({ success: true, data: { id: newId }, message: 'Quiz duplicated' });
  } catch (err) {
    sendError(res, err, 'Failed to duplicate quiz');
  }
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

async function listQuestions(req, res) {
  try {
    const quiz = await quizModel.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found', code: 'NOT_FOUND' });
    const questions = await quizModel.listQuestions(quiz.id);
    res.json({ success: true, data: questions });
  } catch (err) {
    sendError(res, err, 'Failed to list questions');
  }
}

async function createQuestion(req, res) {
  const { type, question_text, options, correct_answer, points, order_index, question_bank_id, hierarchy_id } = req.body;
  try {
    const quiz = await quizModel.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found', code: 'NOT_FOUND' });
    await assertCanManageCourse(req, quiz.course_id);

    const id = await quizModel.createQuestion({
      quiz_id: quiz.id,
      type,
      question_text,
      options,
      correct_answer,
      points,
      order_index,
      question_bank_id,
      hierarchy_id,
    });
    logAudit && logAudit('quiz.question.create', req.user.id, { quizId: quiz.id, questionId: id });
    res.status(201).json({ success: true, data: { id }, message: 'Question created' });
  } catch (err) {
    sendError(res, err, 'Failed to create question');
  }
}

async function importQuestions(req, res) {
  const { questions } = req.body;
  try {
    const quiz = await quizModel.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found', code: 'NOT_FOUND' });
    await assertCanManageCourse(req, quiz.course_id);

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'questions array is required and must not be empty', code: 'VALIDATION_ERROR' });
    }

    const existing = await quizModel.listQuestions(quiz.id);
    const { validateBulkImport } = require('../utils/bulkImportValidation');
    const { valid: validQuestions, invalid, errors, summary } = validateBulkImport(questions, existing);

    if (validQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid questions found after validation',
        code: 'VALIDATION_ERROR',
        data: { errors, summary, invalid },
      });
    }

    const startIndex = existing.length;
    const created = [];

    for (let i = 0; i < validQuestions.length; i += 1) {
      const q = validQuestions[i];
      try {
        const id = await quizModel.createQuestion({
          quiz_id: quiz.id,
          type: q.type,
          question_text: q.question_text,
          options: q.options || null,
          correct_answer: q.correct_answer != null ? q.correct_answer : null,
          points: Number(q.points) || 1,
          order_index: startIndex + i,
        });
        created.push({ id, ...q });
      } catch (err) {
        errors.push({ row: q.row, message: `Failed to create question: ${err.message}` });
      }
    }

    logAudit && logAudit('quiz.questions.import', req.user.id, {
      quizId: quiz.id,
      requested: questions.length,
      imported: created.length,
      failed: invalid.length,
    });

    res.status(201).json({
      success: true,
      data: {
        imported: created.length,
        questions: created,
        errors,
        summary: {
          ...summary,
          failed: invalid.length,
        },
      },
      message: `${created.length} of ${questions.length} questions imported successfully`,
    });
  } catch (err) {
    sendError(res, err, 'Failed to import questions');
  }
}

async function importFromFile(req, res) {
  const quizId = req.params.id;
  const format = req.body.format || 'csv';
  const fileBuffer = req.file ? req.file.buffer : null;
  const rawContent = req.body.content || null;

  try {
    const quiz = await quizModel.findById(quizId);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found', code: 'NOT_FOUND' });
    await assertCanManageCourse(req, quiz.course_id);

    let fileContent;
    if (fileBuffer) {
      fileContent = fileBuffer.toString('utf8');
    } else if (rawContent) {
      fileContent = rawContent;
    } else {
      return res.status(400).json({ success: false, message: 'No file or content provided', code: 'VALIDATION_ERROR' });
    }

    let questions;

    if (format === 'json') {
      try {
        questions = JSON.parse(fileContent);
      } catch (parseErr) {
        return res.status(400).json({ success: false, message: 'Invalid JSON format', code: 'VALIDATION_ERROR', data: { parseError: parseErr.message } });
      }
    } else {
      try {
        questions = parseCsvContent(fileContent);
      } catch (parseErr) {
        return res.status(400).json({ success: false, message: 'Failed to parse CSV file', code: 'VALIDATION_ERROR', data: { parseError: parseErr.message } });
      }
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'No questions found in the file', code: 'VALIDATION_ERROR' });
    }

    const existing = await quizModel.listQuestions(quiz.id);
    const { validateBulkImport } = require('../utils/bulkImportValidation');
    const { valid: validQuestions, invalid, errors, summary } = validateBulkImport(questions, existing);

    if (validQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid questions found after validation',
        code: 'VALIDATION_ERROR',
        data: { errors, summary, invalid },
      });
    }

    const startIndex = existing.length;
    const created = [];

    for (let i = 0; i < validQuestions.length; i += 1) {
      const q = validQuestions[i];
      try {
        const id = await quizModel.createQuestion({
          quiz_id: quiz.id,
          type: q.type,
          question_text: q.question_text,
          options: q.options || null,
          correct_answer: q.correct_answer != null ? q.correct_answer : null,
          points: Number(q.points) || 1,
          order_index: startIndex + i,
        });
        created.push({ id, ...q });
      } catch (err) {
        errors.push({ row: q.row, message: `Failed to create question: ${err.message}` });
      }
    }

    logAudit && logAudit('quiz.questions.import_file', req.user.id, {
      quizId: quiz.id,
      format,
      requested: questions.length,
      imported: created.length,
      failed: invalid.length,
    });

    res.status(201).json({
      success: true,
      data: {
        imported: created.length,
        questions: created,
        errors,
        summary: {
          ...summary,
          failed: invalid.length,
        },
      },
      message: `${created.length} of ${questions.length} questions imported successfully`,
    });
  } catch (err) {
    sendError(res, err, 'Failed to import questions from file');
  }
}

async function updateQuestion(req, res) {
  const { type, question_text, options, correct_answer, points, order_index, question_bank_id, hierarchy_id } = req.body;
  try {
    const question = await quizModel.getQuestionById(req.params.qid);
    if (!question) return res.status(404).json({ success: false, message: 'Question not found', code: 'NOT_FOUND' });
    const quiz = await quizModel.findById(question.quiz_id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found', code: 'NOT_FOUND' });
    await assertCanManageCourse(req, quiz.course_id);

    await quizModel.updateQuestion(req.params.qid, { type, question_text, options, correct_answer, points, order_index, question_bank_id, hierarchy_id });
    res.json({ success: true, message: 'Question updated' });
  } catch (err) {
    sendError(res, err, 'Failed to update question');
  }
}

async function deleteQuestion(req, res) {
  try {
    const question = await quizModel.getQuestionById(req.params.qid);
    if (!question) return res.status(404).json({ success: false, message: 'Question not found', code: 'NOT_FOUND' });
    const quiz = await quizModel.findById(question.quiz_id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found', code: 'NOT_FOUND' });
    await assertCanManageCourse(req, quiz.course_id);

    await quizModel.deleteQuestion(req.params.qid);
    logAudit && logAudit('quiz.question.delete', req.user.id, { quizId: quiz.id, questionId: req.params.qid });
    res.json({ success: true, message: 'Question deleted' });
  } catch (err) {
    sendError(res, err, 'Failed to delete question');
  }
}

async function reorderQuestions(req, res) {
  const { questions } = req.body;
  if (!Array.isArray(questions)) return res.status(400).json({ success: false, message: 'questions array required', code: 'VALIDATION_ERROR' });
  try {
    const quiz = await quizModel.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found', code: 'NOT_FOUND' });
    await assertCanManageCourse(req, quiz.course_id);

    for (let i = 0; i < questions.length; i += 1) {
      await quizModel.updateQuestion(questions[i], { order_index: i + 1 });
    }
    logAudit && logAudit('quiz.reorder', req.user.id, { quizId: quiz.id });
    res.json({ success: true, message: 'Questions reordered' });
  } catch (err) {
    sendError(res, err, 'Failed to reorder questions');
  }
}

// ---------------------------------------------------------------------------
// Question banks
// ---------------------------------------------------------------------------

async function listQuestionBanks(req, res) {
  const { courseId } = req.query;
  if (!courseId) return res.status(400).json({ success: false, message: 'courseId is required', code: 'VALIDATION_ERROR' });
  try {
    await assertCanManageCourse(req, courseId);
    const banks = await quizModel.getQuestionBanks(courseId);
    res.json({ success: true, data: banks });
  } catch (err) {
    sendError(res, err, 'Failed to list question banks');
  }
}

async function createQuestionBank(req, res) {
  const { courseId, title, description } = req.body;
  if (!courseId || !title) return res.status(400).json({ success: false, message: 'courseId and title are required', code: 'VALIDATION_ERROR' });
  try {
    await assertCanManageCourse(req, courseId);
    const id = await quizModel.createQuestionBank({ course_id: courseId, title, description });
    logAudit && logAudit('quiz.bank.create', req.user.id, { bankId: id, courseId });
    res.status(201).json({ success: true, data: { id }, message: 'Question bank created' });
  } catch (err) {
    sendError(res, err, 'Failed to create question bank');
  }
}

async function getQuestionBank(req, res) {
  try {
    const bank = await quizModel.getQuestionBank(req.params.id);
    if (!bank) return res.status(404).json({ success: false, message: 'Question bank not found', code: 'NOT_FOUND' });
    res.json({ success: true, data: bank });
  } catch (err) {
    sendError(res, err, 'Failed to fetch question bank');
  }
}

async function deleteQuestionBank(req, res) {
  try {
    const bank = await quizModel.getQuestionBank(req.params.id);
    if (!bank) return res.status(404).json({ success: false, message: 'Question bank not found', code: 'NOT_FOUND' });
    await assertCanManageCourse(req, bank.course_id);
    await quizModel.deleteQuestionBank(req.params.id);
    res.json({ success: true, message: 'Question bank deleted' });
  } catch (err) {
    sendError(res, err, 'Failed to delete question bank');
  }
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

async function getLeaderboard(req, res) {
  const { limit } = req.query;
  const quizId = req.params.id;
  try {
    let data;
    if (quizId) {
      data = await quizModel.getLeaderboard(quizId, limit);
    } else {
      return res.status(400).json({ success: false, message: 'quizId is required', code: 'VALIDATION_ERROR' });
    }
    res.json({ success: true, data });
  } catch (err) {
    sendError(res, err, 'Failed to fetch leaderboard');
  }
}

async function getQuestionById(req, res) {
  try {
    const question = await quizModel.getQuestionById(req.params.qid);
    if (!question) return res.status(404).json({ success: false, message: 'Question not found', code: 'NOT_FOUND' });
    const parsed = { ...question };
    try { parsed.options = parsed.options ? JSON.parse(parsed.options) : null; } catch { parsed.options = null; }
    try { parsed.correct_answer = parsed.correct_answer ? JSON.parse(parsed.correct_answer) : null; } catch { parsed.correct_answer = null; }
    res.json({ success: true, data: parsed });
  } catch (err) {
    sendError(res, err, 'Failed to fetch question');
  }
}

async function getQuizResults(req, res) {
  try {
    const quiz = await quizModel.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found', code: 'NOT_FOUND' });
    await assertCanManageCourse(req, quiz.course_id);
    const attempts = await quizModel.getQuizAttempts(quiz.id);
    res.json({ success: true, data: attempts });
  } catch (err) {
    sendError(res, err, 'Failed to fetch results');
  }
}

async function getCourseLeaderboard(req, res) {
  const { courseId } = req.params;
  const { limit } = req.query;
  try {
    const data = await quizModel.getCourseLeaderboard(courseId, limit);
    res.json({ success: true, data });
  } catch (err) {
    sendError(res, err, 'Failed to fetch leaderboard');
  }
}

async function listHierarchy(req, res) {
  const quizId = req.params.id;
  try {
    const quiz = await quizModel.findById(quizId);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found', code: 'NOT_FOUND' });
    const items = await quizHierarchyModel.listHierarchy(quizId);
    res.json({ success: true, data: items });
  } catch (err) {
    sendError(res, err, 'Failed to fetch hierarchy');
  }
}

async function createHierarchy(req, res) {
  const quizId = req.params.id;
  const { name, description, level, parent_id } = req.body;
  try {
    const quiz = await quizModel.findById(quizId);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found', code: 'NOT_FOUND' });
    await assertCanManageCourse(req, quiz.course_id);

    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required', code: 'VALIDATION_ERROR' });
    }

    const id = await quizHierarchyModel.create({
      quiz_id: quizId,
      parent_id: parent_id || null,
      name,
      description,
      level: Number(level) || 1,
    });
    logAudit && logAudit('quiz.hierarchy.create', req.user.id, { quizId, hierarchyId: id });
    res.status(201).json({ success: true, data: { id }, message: 'Hierarchy item created' });
  } catch (err) {
    sendError(res, err, 'Failed to create hierarchy item');
  }
}

async function updateHierarchy(req, res) {
  const quizId = req.params.id;
  const hid = req.params.hid;
  const { name, description, level, parent_id } = req.body;
  try {
    const quiz = await quizModel.findById(quizId);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found', code: 'NOT_FOUND' });
    const item = await quizHierarchyModel.findById(hid);
    if (!item || item.quiz_id !== Number(quizId)) {
      return res.status(404).json({ success: false, message: 'Hierarchy item not found', code: 'NOT_FOUND' });
    }
    await assertCanManageCourse(req, quiz.course_id);

    await quizHierarchyModel.update(hid, { name, description, level, parent_id });
    res.json({ success: true, message: 'Hierarchy item updated' });
  } catch (err) {
    sendError(res, err, 'Failed to update hierarchy item');
  }
}

async function deleteHierarchy(req, res) {
  const quizId = req.params.id;
  const hid = req.params.hid;
  try {
    const quiz = await quizModel.findById(quizId);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found', code: 'NOT_FOUND' });
    const item = await quizHierarchyModel.findById(hid);
    if (!item || item.quiz_id !== Number(quizId)) {
      return res.status(404).json({ success: false, message: 'Hierarchy item not found', code: 'NOT_FOUND' });
    }
    await assertCanManageCourse(req, quiz.course_id);

    await quizHierarchyModel.remove(hid);
    res.json({ success: true, message: 'Hierarchy item deleted' });
  } catch (err) {
    sendError(res, err, 'Failed to delete hierarchy item');
  }
}

module.exports = {
  listQuizzes,
  listAllQuizzes,
  listMyQuizzes,
  getQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  publishQuiz,
  archiveQuiz,
  duplicateQuiz,
  listQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  listQuestionBanks,
  createQuestionBank,
  getQuestionBank,
  deleteQuestionBank,
  getLeaderboard,
  getQuizResults,
  getCourseLeaderboard,
  listHierarchy,
  createHierarchy,
  updateHierarchy,
  deleteHierarchy,
  importQuestions,
  importFromFile,
  requireAdminRole,
};

const quizModel = require('../models/quizModel');
const { logAudit } = require('../utils/auditLogger');

function sendError(res, err, fallback = 'Request failed') {
  const status = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const code = err.code || 'INTERNAL_ERROR';
  if (status === 500) console.error('[QuizAttemptController Error]', err);
  return res.status(status).json({ success: false, message: err.message || fallback, code });
}

const FINAL_QUIZ_DEFAULT_ATTEMPTS = 3;
const VIOLATION_ESCALATION = { 1: 'warn', 3: 'autosubmit' }; // admin-configurable defaults

function getEffectiveAttemptCap(quiz, grantedOverrides) {
  if (quiz.quiz_type === 'practice') return 0; // 0 => unlimited
  const configured = Number(quiz.attempts_allowed) || 0;
  const base = configured > 0 ? configured : FINAL_QUIZ_DEFAULT_ATTEMPTS;
  return base + grantedOverrides;
}

// ---------------------------------------------------------------------------
// Attempt lifecycle
// ---------------------------------------------------------------------------

async function startAttempt(req, res) {
  const { quizId } = req.body;
  const userId = req.user.id;

  if (!quizId) return res.status(400).json({ success: false, message: 'quizId is required', code: 'VALIDATION_ERROR' });

  try {
    const quiz = await quizModel.getQuizWithQuestions(quizId);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found', code: 'NOT_FOUND' });
    const isAdmin = ['super_admin', 'admin', 'department_head'].includes(req.user?.role);
    if (!isAdmin && quiz.status !== 'published') {
      return res.status(400).json({ success: false, message: 'Quiz is not available', code: 'QUIZ_NOT_AVAILABLE' });
    }

    // Resume an existing in-progress attempt (prevents duplicate/simultaneous attempts)
    const active = await quizModel.getActiveAttempt(quizId, userId);
    if (active) {
      return res.json({ success: true, data: serializeAttempt(active), quiz: serializeQuizForPlayer(quiz), resumed: true });
    }

    const completed = await quizModel.countCompletedAttempts(quizId, userId);
    const granted = await quizModel.sumGrantedOverrides(quizId, userId);
    const cap = getEffectiveAttemptCap(quiz, granted);

    // Enforce hard cap server-side (Final Quizzes only)
    if (cap > 0 && completed >= cap) {
      const best = await quizModel.getBestAttempt(quizId, userId);
      return res.status(403).json({
        success: false,
        message: 'Attempt limit reached',
        code: 'ATTEMPT_LIMIT_REACHED',
        data: { bestResult: best ? serializeAttempt(best) : null, attemptsUsed: completed, attemptsAllowed: cap },
      });
    }

    const attemptNumber = await quizModel.getMaxAttemptNumber(quizId, userId) + 1;
    const attemptId = await quizModel.createAttempt({
      quiz_id: quizId,
      user_id: userId,
      attempt_number: attemptNumber,
      answers: {},
    });

    const attempt = await quizModel.getAttempt(attemptId);
    logAudit && logAudit('quiz.attempt.start', userId, { quizId, attemptId, attemptNumber });
    res.status(201).json({ success: true, data: serializeAttempt(attempt), quiz: serializeQuizForPlayer(quiz), resumed: false });
  } catch (err) {
    sendError(res, err, 'Failed to start attempt');
  }
}

function serializeAttempt(attempt) {
  let answers = attempt.answers;
  try { answers = typeof answers === 'string' ? JSON.parse(answers) : answers; } catch { answers = {}; }
  return { ...attempt, answers };
}

function serializeQuizForPlayer(quiz) {
  const questions = (quiz.questions || []).map((q) => {
    let options = q.options;
    let correct = q.correct_answer;
    try { options = typeof options === 'string' ? JSON.parse(options) : options; } catch { options = null; }
    try { correct = typeof correct === 'string' ? JSON.parse(correct) : correct; } catch { correct = null; }
    return { ...q, options: options || [], correct_answer: correct };
  });
  return { ...quiz, questions };
}

async function getAttempt(req, res) {
  try {
    const attempt = await quizModel.getAttempt(req.params.id);
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found', code: 'NOT_FOUND' });
    if (attempt.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your attempt', code: 'FORBIDDEN' });
    }
    res.json({ success: true, data: serializeAttempt(attempt) });
  } catch (err) {
    sendError(res, err, 'Failed to fetch attempt');
  }
}

async function saveDraftAttempt(req, res) {
  const { answers } = req.body;
  try {
    const attempt = await quizModel.getAttempt(req.params.id);
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found', code: 'NOT_FOUND' });
    if (attempt.user_id !== req.user.id) return res.status(403).json({ success: false, message: 'Not your attempt', code: 'FORBIDDEN' });
    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Attempt cannot be modified', code: 'INVALID_STATE' });
    }
    await quizModel.updateAttempt(req.params.id, { answers });
    res.json({ success: true, message: 'Draft saved' });
  } catch (err) {
    sendError(res, err, 'Failed to save draft');
  }
}

async function submitAttempt(req, res) {
  const { answers, timeTakenSec } = req.body;
  const userId = req.user.id;

  try {
    const attempt = await quizModel.getAttempt(req.params.id);
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found', code: 'NOT_FOUND' });
    if (attempt.user_id !== userId) return res.status(403).json({ success: false, message: 'Not your attempt', code: 'FORBIDDEN' });
    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Attempt already submitted', code: 'INVALID_STATE' });
    }

    const quiz = await quizModel.getQuizWithQuestions(attempt.quiz_id);
    const parsedAnswers = answers || {};
    const evaluation = evaluateAttempt(quiz.questions, parsedAnswers);

    // Timeout enforcement (time_limit is in minutes, timeTakenSec is in seconds)
    const timedOut = quiz.time_limit && Number(timeTakenSec) > Number(quiz.time_limit) * 60 * 1.05;

    const updated = await quizModel.updateAttempt(attempt.id, {
      status: 'completed',
      submitted_at: new Date(),
      time_taken_sec: timeTakenSec ? Number(timeTakenSec) : null,
      score: evaluation.score,
      max_score: evaluation.maxScore,
      percentage: evaluation.percentage,
      passed: evaluation.percentage >= (Number(quiz.passing_score) || 0),
      timed_out: timedOut ? 1 : 0,
      answers: parsedAnswers,
    });

    // Persist to the legacy quiz_submissions table so the lesson pass-check keeps working
    await quizModel.createSubmission({
      quiz_id: attempt.quiz_id,
      user_id: userId,
      answers: parsedAnswers,
      score: evaluation.score,
      max_score: evaluation.maxScore,
      submitted_at: new Date(),
    });

    const saved = await quizModel.getAttempt(attempt.id);

    await quizModel.createResult({
      attempt_id: attempt.id,
      quiz_id: attempt.quiz_id,
      user_id: userId,
      score: evaluation.score,
      max_score: evaluation.maxScore,
      percentage: evaluation.percentage,
      passed: evaluation.percentage >= (Number(quiz.passing_score) || 0),
      feedback: evaluation.perQuestion,
    });

    logAudit && logAudit('quiz.attempt.submit', userId, { quizId: attempt.quiz_id, attemptId: attempt.id, score: evaluation.score, percentage: evaluation.percentage });

    res.json({ success: true, data: { attempt: serializeAttempt(saved), result: buildResultResponse(saved, quiz) } });
  } catch (err) {
    sendError(res, err, 'Failed to submit attempt');
  }
}

function evaluateAttempt(questions, answers) {
  let score = 0;
  const perQuestion = [];
  for (const q of questions) {
    const weight = Number(q.points) || 1;
    const selected = answers[q.id];
    const correct = q.correct_answer;
    const isCorrect = isAnswerCorrect(q.type, selected, correct);
    if (isCorrect) score += weight;
    perQuestion.push({
      questionId: q.id,
      isCorrect,
      points: weight,
      selected,
    });
  }
  const maxScore = (questions || []).reduce((sum, q) => sum + (Number(q.points) || 1), 0);
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 0;
  return { score, maxScore, percentage, perQuestion };
}

function isAnswerCorrect(type, selected, correct) {
  const normalize = (v) => String(v ?? '').trim().toLowerCase();
  if (type === 'multiple_choice' || type === 'true_false') {
    return normalize(selected) === normalize(correct);
  }
  if (type === 'multi_select' || type === 'multiple_select') {
    const sel = Array.isArray(selected) ? selected.map(normalize) : [normalize(selected)];
    const cor = Array.isArray(correct) ? correct.map(normalize) : [normalize(correct)];
    return sel.length === cor.length && sel.every((v) => cor.includes(v));
  }
  if (type === 'short_answer') {
    return normalize(selected) === normalize(correct);
  }
  // essay / manual -> auto-corrected false until manually graded
  return false;
}

function buildResultResponse(attempt, quiz) {
  const percentage = Number(attempt.percentage) || 0;
  const passing = Number(quiz.passing_score) || 0;
  return {
    score: attempt.score,
    maxScore: attempt.max_score,
    percentage,
    passed: percentage >= passing,
    timeTakenSec: attempt.time_taken_sec,
    isManualReview: percentage < 100 && (quiz.grading_method === 'manual' || isNaN(Number(attempt.score))),
  };
}

async function cancelAttempt(req, res) {
  try {
    const attempt = await quizModel.getAttempt(req.params.id);
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found', code: 'NOT_FOUND' });
    if (attempt.user_id !== req.user.id) return res.status(403).json({ success: false, message: 'Not your attempt', code: 'FORBIDDEN' });
    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Attempt cannot be cancelled', code: 'INVALID_STATE' });
    }
    await quizModel.updateAttempt(req.params.id, { status: 'cancelled' });
    res.json({ success: true, message: 'Attempt cancelled' });
  } catch (err) {
    sendError(res, err, 'Failed to cancel attempt');
  }
}

async function listMyAttempts(req, res) {
  const { quizId } = req.query;
  const userId = req.user.id;
  if (!quizId) return res.status(400).json({ success: false, message: 'quizId is required', code: 'VALIDATION_ERROR' });
  try {
    const attempts = await quizModel.listAttempts(quizId, userId);
    res.json({ success: true, data: attempts.map(serializeAttempt) });
  } catch (err) {
    sendError(res, err, 'Failed to list attempts');
  }
}

async function getAttemptResults(req, res) {
  try {
    const attempt = await quizModel.getAttempt(req.params.id);
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found', code: 'NOT_FOUND' });
    if (attempt.user_id !== req.user.id) return res.status(403).json({ success: false, message: 'Not your attempt', code: 'FORBIDDEN' });

    const result = await quizModel.getAttemptResults(attempt.id);
    let feedback = result ? result.feedback : null;
    try { feedback = feedback ? JSON.parse(feedback) : null; } catch { feedback = null; }

    const quiz = attempt.quiz_id ? await quizModel.findById(attempt.quiz_id) : null;
    res.json({ success: true, data: { attempt: serializeAttempt(attempt), result, quiz } });
  } catch (err) {
    sendError(res, err, 'Failed to fetch results');
  }
}

async function getQuizResultsForTaker(req, res) {
  const { quizId } = req.params;
  const userId = req.user.id;
  try {
    const results = await quizModel.getQuizResultsForUser(quizId, userId);
    const quiz = await quizModel.findById(quizId);
    let parsed = [];
    for (const r of results) {
      let feedback = r.feedback;
      try { feedback = feedback ? JSON.parse(feedback) : null; } catch { feedback = null; }
      parsed.push({ ...r, feedback });
    }
    res.json({ success: true, data: { quiz, results: parsed } });
  } catch (err) {
    sendError(res, err, 'Failed to fetch results');
  }
}

// ---------------------------------------------------------------------------
// Integrity / violations
// ---------------------------------------------------------------------------

async function logViolation(req, res) {
  const { attemptId, quizId, type, metadata } = req.body;
  const userId = req.user.id;

  if (!attemptId) return res.status(400).json({ success: false, message: 'attemptId is required', code: 'VALIDATION_ERROR' });

  try {
    const attempt = await quizModel.getAttempt(attemptId);
    if (!attempt || attempt.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Invalid attempt', code: 'FORBIDDEN' });
    }

    await quizModel.logViolation({ attempt_id: attemptId, user_id: userId, quiz_id: quizId || attempt.quiz_id, type, metadata });
    await quizModel.incrementAttemptViolationCount(attemptId);

    const count = await quizModel.countViolations(attemptId);
    let action = 'none';
    if (count >= (VIOLATION_ESCALATION[3] !== undefined ? 3 : 3)) action = 'autosubmit';
    else if (count >= (VIOLATION_ESCALATION[1] !== undefined ? 1 : 1)) action = 'warn';

    logAudit && logAudit('quiz.violation.log', userId, { attemptId, type, count });
    res.status(201).json({ success: true, data: { violationCount: count, action } });
  } catch (err) {
    sendError(res, err, 'Failed to log violation');
  }
}

async function getViolations(req, res) {
  const { userId, quizId, courseId, type, dateFrom, dateTo, page, limit } = req.query;
  try {
    const violations = await quizModel.getViolations({
      user_id: userId,
      quiz_id: quizId,
      course_id: courseId,
      type,
      date_from: dateFrom,
      date_to: dateTo,
      page,
      limit,
    });
    res.json({ success: true, data: violations });
  } catch (err) {
    sendError(res, err, 'Failed to fetch violations');
  }
}

async function getFlaggedAttempts(req, res) {
  const { courseId, min } = req.query;
  try {
    const attempts = await quizModel.getFlaggedAttempts(courseId || null, Number(min) || 3);
    res.json({ success: true, data: attempts });
  } catch (err) {
    sendError(res, err, 'Failed to fetch flagged attempts');
  }
}

// ---------------------------------------------------------------------------
// Admin attempt overrides
// ---------------------------------------------------------------------------

async function grantOverride(req, res) {
  const { quizId, userId, attemptsGranted, reason, expiresAt } = req.body;
  const grantedBy = req.user.id;
  if (!quizId || !userId) return res.status(400).json({ success: false, message: 'quizId and userId are required', code: 'VALIDATION_ERROR' });
  try {
    const id = await quizModel.createAttemptOverride({
      quiz_id: quizId,
      user_id: userId,
      granted_by: grantedBy,
      attempts_granted: Number(attemptsGranted) || 1,
      reason,
      expires_at: expiresAt ?? null,
    });
    logAudit && logAudit('quiz.override.grant', grantedBy, { quizId, userId, attemptsGranted });
    res.status(201).json({ success: true, data: { id }, message: 'Attempt override granted' });
  } catch (err) {
    sendError(res, err, 'Failed to grant override');
  }
}

async function listOverrides(req, res) {
  const { quizId, userId } = req.query;
  try {
    const overrides = await quizModel.listOverrides({ quiz_id: quizId, user_id: userId });
    res.json({ success: true, data: overrides });
  } catch (err) {
    sendError(res, err, 'Failed to list overrides');
  }
}

async function revokeOverride(req, res) {
  try {
    await quizModel.revokeOverride(req.params.id);
    res.json({ success: true, message: 'Override revoked' });
  } catch (err) {
    sendError(res, err, 'Failed to revoke override');
  }
}

module.exports = {
  startAttempt,
  getAttempt,
  saveDraftAttempt,
  submitAttempt,
  cancelAttempt,
  listMyAttempts,
  getAttemptResults,
  getQuizResultsForTaker,
  logViolation,
  getViolations,
  getFlaggedAttempts,
  grantOverride,
  listOverrides,
  revokeOverride,
};

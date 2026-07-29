const db = require('../config/database');

async function listQuizzes(courseId, filters = {}) {
  const { module_id, status, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  let sql = 'SELECT * FROM quizzes WHERE course_id = ? AND is_deleted = FALSE';
  const params = [courseId];

  if (module_id) {
    sql += ' AND module_id = ?';
    params.push(module_id);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.query(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await db.query(
    'SELECT * FROM quizzes WHERE id = ? AND is_deleted = FALSE LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function create(quizData) {
  const { course_id, module_id, title, description, time_limit, max_score, attempts_allowed, passing_score, feedback_policy, status } = quizData;

  const [result] = await db.query(
    `INSERT INTO quizzes (
      course_id, module_id, title, description, time_limit, max_score, attempts_allowed, passing_score, feedback_policy, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      course_id,
      module_id ?? null,
      title,
      description ?? null,
      time_limit ?? null,
      max_score || 100,
      attempts_allowed || 1,
      passing_score ?? null,
      feedback_policy || 'immediate',
      status || 'draft',
    ]
  );
  return result.insertId;
}

async function update(id, updates) {
  const allowed = ['title', 'description', 'time_limit', 'max_score', 'attempts_allowed', 'passing_score', 'feedback_policy', 'status', 'module_id'];
  const sets = [];
  const params = [];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      sets.push(`${key} = ?`);
      params.push(updates[key]);
    }
  }

  if (!sets.length) return 0;
  params.push(id);

  const [result] = await db.query(
    `UPDATE quizzes SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = FALSE`,
    params
  );
  return result.affectedRows;
}

async function softDelete(id) {
  const [result] = await db.query(
    'UPDATE quizzes SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
  return result.affectedRows;
}

async function listQuestions(quizId) {
  const [rows] = await db.query(
    'SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index ASC, id ASC',
    [quizId]
  );
  return rows;
}

async function createQuestion(questionData) {
  const { quiz_id, type, question_text, options, correct_answer, points, order_index } = questionData;

  const [result] = await db.query(
    `INSERT INTO quiz_questions (quiz_id, type, question_text, options, correct_answer, points, order_index)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      quiz_id,
      type || 'multiple_choice',
      question_text,
      options ? JSON.stringify(options) : null,
      correct_answer ? JSON.stringify(correct_answer) : null,
      points || 1,
      order_index ?? 0,
    ]
  );
  return result.insertId;
}

async function createSubmission(submissionData) {
  const { quiz_id, user_id, answers, score, max_score, submitted_at, graded_at } = submissionData;

  const [result] = await db.query(
    `INSERT INTO quiz_submissions (quiz_id, user_id, answers, score, max_score, submitted_at, graded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      quiz_id,
      user_id,
      answers ? JSON.stringify(answers) : null,
      score ?? null,
      max_score ?? null,
      submitted_at ?? null,
      graded_at ?? null,
    ]
  );
  return result.insertId;
}

async function updateSubmission(id, updates) {
  const allowed = ['answers', 'score', 'max_score', 'submitted_at', 'graded_at'];
  const sets = [];
  const params = [];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      sets.push(`${key} = ?`);
      params.push(updates[key]);
    }
  }

  if (!sets.length) return 0;
  params.push(id);

  const [result] = await db.query(
    `UPDATE quiz_submissions SET ${sets.join(', ')} WHERE id = ?`,
    params
  );
  return result.affectedRows;
}

async function getUserSubmissions(userId, quizId) {
  const [rows] = await db.query(
    'SELECT * FROM quiz_submissions WHERE user_id = ? AND quiz_id = ? ORDER BY created_at DESC',
    [userId, quizId]
  );
  return rows;
}

async function getQuizResults(quizId) {
  const [rows] = await db.query(
    `SELECT 
      qs.*,
      u.full_name AS user_name,
      u.email AS user_email
     FROM quiz_submissions qs
     JOIN users u ON qs.user_id = u.id
     WHERE qs.quiz_id = ?
     ORDER BY qs.created_at DESC`,
    [quizId]
  );
  return rows;
}

module.exports = {
  listQuizzes,
  findById,
  create,
  update,
  softDelete,
  listQuestions,
  createQuestion,
  createSubmission,
  updateSubmission,
  getUserSubmissions,
  getQuizResults,
};

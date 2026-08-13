const db = require('../config/database');

async function listQuizzes(courseId, filters = {}) {
  const { module_id, status, page = 1, limit = 20, business_id } = filters;
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 20;
  const offset = (pageNum - 1) * limitNum;

  let sql = `SELECT q.*, COUNT(DISTINCT qq.id) AS question_count
    FROM quizzes q
    LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
    LEFT JOIN courses c ON q.course_id = c.id
    LEFT JOIN departments d ON c.department_id = d.id
    WHERE q.course_id = ? AND q.is_deleted = FALSE`;
  const params = [courseId];

  if (module_id) {
    sql += ' AND q.module_id = ?';
    params.push(module_id);
  }
  if (status) {
    sql += ' AND q.status = ?';
    params.push(status);
  }
  if (business_id) {
    sql += ' AND d.business_id = ?';
    params.push(parseInt(business_id, 10));
  }

  sql += ' GROUP BY q.id ORDER BY q.created_at DESC LIMIT ? OFFSET ?';
  params.push(limitNum, offset);

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

// Like findById but ignores the soft-delete flag. Used by force-delete to locate
// an already-soft-deleted quiz (e.g. orphaned after its course was removed).
async function findByIdIgnoringDelete(id) {
  const [rows] = await db.query(
    'SELECT * FROM quizzes WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function listAllQuizzes(filters = {}) {
  const { search, status, quizType, page = 1, limit = 20, business_id } = filters;
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 20;
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  const cParams = [];
  if (status) { conditions.push('q.status = ?'); cParams.push(status); }
  if (quizType) { conditions.push('q.quiz_type = ?'); cParams.push(quizType); }
  if (search) { conditions.push('(q.title LIKE ? OR c.title LIKE ?)'); cParams.push(`%${search}%`, `%${search}%`); }
  if (business_id) { conditions.push('d.business_id = ?'); cParams.push(parseInt(business_id, 10)); }
  const whereClause = conditions.length ? ' AND ' + conditions.join(' AND ') : '';

  const [rows] = await db.query(
    `SELECT q.*, c.title AS course_title,
            COUNT(DISTINCT qq.id) AS question_count,
            COUNT(DISTINCT qa.id) AS attempt_count
       FROM quizzes q
       LEFT JOIN courses c ON q.course_id = c.id
       LEFT JOIN departments d ON c.department_id = d.id
       LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
       LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.status IN ('completed', 'graded')
       WHERE q.is_deleted = FALSE ${whereClause}
       GROUP BY q.id
       ORDER BY q.created_at DESC
        LIMIT ? OFFSET ?`,
    [...cParams, limitNum, offset]
  );

  const [{ total } = { total: 0 }] = await db.query(
    `SELECT COUNT(DISTINCT q.id) AS total
       FROM quizzes q
       LEFT JOIN courses c ON q.course_id = c.id
       LEFT JOIN departments d ON c.department_id = d.id
       WHERE q.is_deleted = FALSE ${whereClause}`,
    cParams
  );

  return { data: rows, total };
}

async function create(quizData) {
  const { course_id, module_id, title, description, time_limit, max_score, attempts_allowed, passing_score, feedback_policy, status, quiz_type, randomize_questions, shuffle_options, grading_method } = quizData;

  const [result] = await db.query(
    `INSERT INTO quizzes (
      course_id, module_id, title, description, time_limit, max_score, attempts_allowed, passing_score,
      feedback_policy, status, quiz_type, randomize_questions, shuffle_options, grading_method
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      quiz_type || 'practice',
      randomize_questions ? 1 : 0,
      shuffle_options ? 1 : 0,
      grading_method || 'auto',
    ]
  );
  return result.insertId;
}

async function update(id, updates) {
  const allowed = [
    'title', 'description', 'time_limit', 'max_score', 'attempts_allowed', 'passing_score',
    'feedback_policy', 'status', 'module_id', 'quiz_type', 'randomize_questions',
    'shuffle_options', 'grading_method',
  ];
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

// Hard delete a quiz, bypassing the soft-delete flag. Used when a parent course
// has already been removed (which soft-deletes the quiz) and the quiz needs to
// be fully purged. Dependent rows are removed by their ON DELETE CASCADE FKs.
async function hardDelete(id) {
  const [result] = await db.query('DELETE FROM quizzes WHERE id = ?', [id]);
  return result.affectedRows;
}

// Soft-delete every quiz belonging to a course. Dependent rows
// (quiz_questions, quiz_attempts, quiz_results, etc.) are removed by their
// ON DELETE CASCADE FKs. Returns the count of quizzes affected.
async function softDeleteByCourse(courseId) {
  const [result] = await db.query(
    'UPDATE quizzes SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE course_id = ? AND is_deleted = FALSE',
    [courseId]
  );
  return result.affectedRows;
}

async function listQuestions(quizId) {
  const [rows] = await db.query(
    'SELECT * FROM quiz_questions WHERE quiz_id = ? AND is_deleted = FALSE ORDER BY order_index ASC, id ASC',
    [quizId]
  );
  return rows;
}

async function getQuestionById(id) {
  const [rows] = await db.query(
    'SELECT * FROM quiz_questions WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function createQuestion(questionData) {
  const { quiz_id, type, question_text, options, correct_answer, points, order_index, question_bank_id, hierarchy_id } = questionData;

  const [result] = await db.query(
    `INSERT INTO quiz_questions (quiz_id, type, question_text, options, correct_answer, points, order_index, question_bank_id, hierarchy_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      quiz_id,
      type || 'multiple_choice',
      question_text,
      options ? JSON.stringify(options) : null,
      correct_answer ? JSON.stringify(correct_answer) : null,
      points || 1,
      order_index ?? 0,
      question_bank_id ?? null,
      hierarchy_id ?? null,
    ]
  );
  return result.insertId;
}

// ---------------------------------------------------------------------------
// Question management
// ---------------------------------------------------------------------------

async function updateQuestion(id, updates) {
  const allowed = ['quiz_id', 'type', 'question_text', 'options', 'correct_answer', 'points', 'order_index', 'question_bank_id', 'hierarchy_id'];
  const sets = [];
  const params = [];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      let val = updates[key];
      if (key === 'options' || key === 'correct_answer') {
        val = val ? JSON.stringify(val) : null;
      }
      sets.push(`${key} = ?`);
      params.push(val);
    }
  }

  if (!sets.length) return 0;
  params.push(id);

  const [result] = await db.query(
    `UPDATE quiz_questions SET ${sets.join(', ')} WHERE id = ?`,
    params
  );
  return result.affectedRows;
}

async function deleteQuestion(id) {
  const [result] = await db.query('UPDATE quiz_questions SET is_deleted = TRUE WHERE id = ?', [id]);
  return result.affectedRows;
}

// ---------------------------------------------------------------------------
// Question bank
// ---------------------------------------------------------------------------

async function createQuestionBank(bankData) {
  const { course_id, title, description } = bankData;
  const [result] = await db.query(
    `INSERT INTO quiz_question_banks (course_id, title, description) VALUES (?, ?, ?)`,
    [course_id, title, description ?? null]
  );
  return result.insertId;
}

async function getQuestionBanks(courseId) {
  const [rows] = await db.query(
    'SELECT * FROM quiz_question_banks WHERE course_id = ? AND is_deleted = FALSE ORDER BY created_at DESC',
    [courseId]
  );
  return rows;
}

async function getQuestionBank(id) {
  const [rows] = await db.query(
    'SELECT * FROM quiz_question_banks WHERE id = ? AND is_deleted = FALSE LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function deleteQuestionBank(id) {
  const [result] = await db.query(
    'UPDATE quiz_question_banks SET is_deleted = TRUE WHERE id = ?',
    [id]
  );
  return result.affectedRows;
}

// ---------------------------------------------------------------------------
// Attempts (lifecycle + server-side enforcement source of truth)
// ---------------------------------------------------------------------------

async function getQuizWithQuestions(quizId) {
  const [quizzes] = await db.query(
    'SELECT * FROM quizzes WHERE id = ? AND is_deleted = FALSE LIMIT 1',
    [quizId]
  );
  const quiz = quizzes[0];
  if (!quiz) return null;

    const [questions] = await db.query('SELECT * FROM quiz_questions WHERE quiz_id = ? AND is_deleted = FALSE ORDER BY order_index ASC, id ASC', [quizId]);

  return { ...quiz, questions: questions || [] };
}

async function getActiveAttempt(quizId, userId) {
  const [rows] = await db.query(
    'SELECT * FROM quiz_attempts WHERE quiz_id = ? AND user_id = ? AND status = ? AND is_deleted = FALSE LIMIT 1',
    [quizId, userId, 'in_progress']
  );
  return rows[0] || null;
}

async function countCompletedAttempts(quizId, userId) {
  const [[{ c }]] = await db.query(
    `SELECT COUNT(*) AS c FROM quiz_attempts
     WHERE quiz_id = ? AND user_id = ? AND status IN ('completed','graded') AND is_deleted = FALSE`,
    [quizId, userId]
  );
  return c || 0;
}

async function getBestAttempt(quizId, userId) {
  const [rows] = await db.query(
    `SELECT * FROM quiz_attempts
     WHERE quiz_id = ? AND user_id = ? AND status IN ('completed','graded') AND is_deleted = FALSE
     ORDER BY score DESC, time_taken_sec ASC, attempt_number ASC
     LIMIT 1`,
    [quizId, userId]
  );
  return rows[0] || null;
}

async function getMaxAttemptNumber(quizId, userId) {
  const [[{ n }]] = await db.query(
    `SELECT MAX(attempt_number) AS n FROM quiz_attempts WHERE quiz_id = ? AND user_id = ? AND is_deleted = FALSE`,
    [quizId, userId]
  );
  return n || 0;
}

async function createAttempt(attemptData) {
  const { quiz_id, user_id, attempt_number, answers, time_limit_sec } = attemptData;
  const [result] = await db.query(
    `INSERT INTO quiz_attempts (quiz_id, user_id, attempt_number, answers, started_at)
     VALUES (?, ?, ?, ?, NOW())`,
    [quiz_id, user_id, attempt_number, answers ? JSON.stringify(answers) : null]
  );
  return result.insertId;
}

async function getAttempt(id) {
  const [rows] = await db.query(
    'SELECT * FROM quiz_attempts WHERE id = ? AND is_deleted = FALSE LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function updateAttempt(id, updates) {
  const allowed = ['status', 'score', 'max_score', 'percentage', 'passed', 'submitted_at', 'time_taken_sec', 'timed_out', 'answers', 'violation_count'];
  const sets = [];
  const params = [];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      let val = updates[key];
      if (key === 'answers') val = val ? JSON.stringify(val) : null;
      sets.push(`${key} = ?`);
      params.push(val);
    }
  }

  if (!sets.length) return 0;
  params.push(id);

  const [result] = await db.query(
    `UPDATE quiz_attempts SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = FALSE`,
    params
  );
  return result.affectedRows;
}

async function listAttempts(quizId, userId, status = null) {
  let sql = 'SELECT * FROM quiz_attempts WHERE quiz_id = ? AND user_id = ? AND is_deleted = FALSE';
  const params = [quizId, userId];
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  sql += ' ORDER BY attempt_number DESC';
  const [rows] = await db.query(sql, params);
  return rows;
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

async function createResult(resultData) {
  const { attempt_id, quiz_id, user_id, score, max_score, percentage, passed, feedback, is_manual_review } = resultData;
  const [result] = await db.query(
    `INSERT INTO quiz_results (attempt_id, quiz_id, user_id, score, max_score, percentage, passed, feedback, is_manual_review, graded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      attempt_id, quiz_id, user_id, score, max_score, percentage,
      passed, feedback ? JSON.stringify(feedback) : null, is_manual_review ? 1 : 0,
    ]
  );
  return result.insertId;
}

async function getAttemptResults(attemptId) {
  const [rows] = await db.query(
    `SELECT * FROM quiz_results WHERE attempt_id = ? LIMIT 1`,
    [attemptId]
  );
  return rows[0] || null;
}

async function getQuizResultsForUser(quizId, userId) {
  const [rows] = await db.query(
    `SELECT r.* FROM quiz_results r
     WHERE r.quiz_id = ? AND r.user_id = ? AND (r.passed IS NOT NULL)
     ORDER BY r.created_at DESC`,
    [quizId, userId]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Violations
// ---------------------------------------------------------------------------

async function logViolation(violationData) {
  const { attempt_id, user_id, quiz_id, type, metadata } = violationData;
  const [result] = await db.query(
    `INSERT INTO quiz_violations (attempt_id, user_id, quiz_id, type, metadata)
     VALUES (?, ?, ?, ?, ?)`,
    [attempt_id, user_id, quiz_id, type, metadata ? JSON.stringify(metadata) : null]
  );
  return result.insertId;
}

async function getViolations(filters = {}) {
  const { user_id, quiz_id, course_id, type, date_from, date_to, page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;
  let sql = `SELECT v.*, u.full_name AS user_name, u.email AS user_email, q.title AS quiz_title, q.course_id, c.title AS course_title, a.attempt_number
             FROM quiz_violations v
             JOIN users u ON v.user_id = u.id
             LEFT JOIN quizzes q ON v.quiz_id = q.id
             LEFT JOIN courses c ON q.course_id = c.id
             LEFT JOIN quiz_attempts a ON v.attempt_id = a.id`;
  const params = [];
  const conditions = [];

  if (user_id) {
    conditions.push('v.user_id = ?');
    params.push(user_id);
  }
  if (quiz_id) {
    conditions.push('v.quiz_id = ?');
    params.push(quiz_id);
  }
  if (course_id) {
    conditions.push('q.course_id = ?');
    params.push(course_id);
  }
  if (type) {
    conditions.push('v.type = ?');
    params.push(type);
  }
  if (date_from) {
    conditions.push('v.timestamp >= ?');
    params.push(date_from);
  }
  if (date_to) {
    conditions.push('v.timestamp <= ?');
    params.push(date_to);
  }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ` ORDER BY v.timestamp DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await db.query(sql, params);
  return rows;
}

async function getViolationsByUser(filters = {}) {
  const { quiz_id, course_id, type, date_from, date_to } = filters;
  let whereSql = '';
  const params = [];
  const conditions = [];

  if (quiz_id) {
    conditions.push('v.quiz_id = ?');
    params.push(quiz_id);
  }
  if (course_id) {
    conditions.push('q.course_id = ?');
    params.push(course_id);
  }
  if (type) {
    conditions.push('v.type = ?');
    params.push(type);
  }
  if (date_from) {
    conditions.push('v.timestamp >= ?');
    params.push(date_from);
  }
  if (date_to) {
    conditions.push('v.timestamp <= ?');
    params.push(date_to);
  }
  if (conditions.length) whereSql = ' WHERE ' + conditions.join(' AND ');

  const [users] = await db.query(
    `SELECT u.id AS user_id, u.full_name AS user_name, u.email AS user_email,
            COUNT(v.id) AS violation_count,
            SUM(CASE WHEN v.type = 'devtools_opened' OR v.type = 'screenshot_attempt' THEN 1 ELSE 0 END) AS high_count,
            SUM(CASE WHEN v.type = 'copy_attempt' OR v.type = 'fullscreen_exit' OR v.type = 'tab_switch' THEN 1 ELSE 0 END) AS medium_count,
            SUM(CASE WHEN v.type = 'right_click' THEN 1 ELSE 0 END) AS low_count,
            MAX(v.timestamp) AS last_violation_at
     FROM users u
     JOIN quiz_violations v ON v.user_id = u.id
     LEFT JOIN quizzes q ON v.quiz_id = q.id
     ${whereSql}
     GROUP BY u.id, u.full_name, u.email
     HAVING COUNT(v.id) > 0
     ORDER BY violation_count DESC, u.full_name ASC`,
    params
  );
  return users;
}

async function getViolationsForUser(userId, filters = {}) {
  const { quiz_id, course_id, type, date_from, date_to } = filters;
  let sql = `SELECT v.*, u.full_name AS user_name, u.email AS user_email, q.title AS quiz_title, q.course_id, c.title AS course_title, a.attempt_number
             FROM quiz_violations v
             JOIN users u ON v.user_id = u.id
             LEFT JOIN quizzes q ON v.quiz_id = q.id
             LEFT JOIN courses c ON q.course_id = c.id
             LEFT JOIN quiz_attempts a ON v.attempt_id = a.id
             WHERE v.user_id = ?`;
  const params = [userId];

  if (quiz_id) {
    sql += ' AND v.quiz_id = ?';
    params.push(quiz_id);
  }
  if (course_id) {
    sql += ' AND q.course_id = ?';
    params.push(course_id);
  }
  if (type) {
    sql += ' AND v.type = ?';
    params.push(type);
  }
  if (date_from) {
    sql += ' AND v.timestamp >= ?';
    params.push(date_from);
  }
  if (date_to) {
    sql += ' AND v.timestamp <= ?';
    params.push(date_to);
  }
  sql += ' ORDER BY v.timestamp DESC';

  const [rows] = await db.query(sql, params);
  return rows;
}

async function countViolations(attemptId) {
  const [[{ c }]] = await db.query(
    'SELECT COUNT(*) AS c FROM quiz_violations WHERE attempt_id = ?',
    [attemptId]
  );
  return c || 0;
}

async function incrementAttemptViolationCount(attemptId) {
  const [result] = await db.query(
    'UPDATE quiz_attempts SET violation_count = violation_count + 1 WHERE id = ?',
    [attemptId]
  );
  return result.affectedRows;
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

async function getLeaderboard(quizId, limit = 50, scope = {}) {
  const safeLimit = Math.max(1, Number(limit) || 50);
  const { role, businessId, scopedDepartmentIds } = scope;
  const conditions = ['a.quiz_id = ?', "a.status IN ('completed','graded')", 'a.is_deleted = FALSE'];
  const params = [quizId];

  if (role === 'admin' && businessId) {
    conditions.push('u.business_id = ?');
    params.push(businessId);
  } else if (role === 'department_head' && Array.isArray(scopedDepartmentIds) && scopedDepartmentIds.length) {
    const placeholders = scopedDepartmentIds.map(() => '?').join(',');
    conditions.push(`u.department_id IN (${placeholders})`);
    params.push(...scopedDepartmentIds);
  }

  const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const [rows] = await db.query(
    `SELECT u.id AS user_id, u.full_name AS user_name, u.email AS user_email,
            a.score, a.max_score, a.percentage, a.time_taken_sec, a.attempt_number,
            ROW_NUMBER() OVER (ORDER BY a.score DESC, a.time_taken_sec ASC, a.attempt_number ASC) AS rank
     FROM quiz_attempts a
     JOIN users u ON a.user_id = u.id
     ${whereClause}
     ORDER BY a.score DESC, a.time_taken_sec ASC, a.attempt_number ASC
     LIMIT ?`,
    [...params, safeLimit]
  );
  return rows;
}

async function getCourseLeaderboard(courseId, limit = 50, scope = {}) {
  const safeLimit = Math.max(1, Number(limit) || 50);
  const { role, businessId, scopedDepartmentIds } = scope;
  const conditions = ['q.course_id = ?', "a.status IN ('completed','graded')", 'a.is_deleted = FALSE', 'q.is_deleted = FALSE'];
  const params = [courseId];

  if (role === 'admin' && businessId) {
    conditions.push('u.business_id = ?');
    params.push(businessId);
  } else if (role === 'department_head' && Array.isArray(scopedDepartmentIds) && scopedDepartmentIds.length) {
    const placeholders = scopedDepartmentIds.map(() => '?').join(',');
    conditions.push(`u.department_id IN (${placeholders})`);
    params.push(...scopedDepartmentIds);
  }

  const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const [rows] = await db.query(
    `SELECT u.id AS user_id, u.full_name AS user_name, u.email AS user_email,
            a.score, a.max_score, a.percentage, a.time_taken_sec, a.attempt_number,
            ROW_NUMBER() OVER (ORDER BY a.score DESC, a.time_taken_sec ASC, a.attempt_number ASC) AS rank
     FROM quiz_attempts a
     JOIN quizzes q ON a.quiz_id = q.id
     JOIN users u ON a.user_id = u.id
     ${whereClause}
     ORDER BY a.score DESC, a.time_taken_sec ASC, a.attempt_number ASC
     LIMIT ?`,
    [...params, safeLimit]
  );
  return rows;
}

async function getFlaggedAttempts(courseId = null, minViolations = 3) {
  const params = [minViolations];
  let sql = `SELECT a.id, a.quiz_id, a.user_id, a.attempt_number, a.score, a.percentage,
              a.time_taken_sec, a.violation_count, a.started_at, a.submitted_at,
              u.full_name AS user_name, u.email AS user_email, q.title AS quiz_title
             FROM quiz_attempts a
             JOIN users u ON a.user_id = u.id
             LEFT JOIN quizzes q ON a.quiz_id = q.id
             WHERE a.status IN ('completed','graded') AND a.is_deleted = FALSE AND a.violation_count >= ?`;
  if (courseId) {
    sql += ' AND q.course_id = ?';
    params.push(courseId);
  }
  sql += ' ORDER BY a.violation_count DESC, a.created_at DESC';
  const [rows] = await db.query(sql, params);
  return rows;
}

// ---------------------------------------------------------------------------
// Attempt overrides (admin grants extra attempts)
// ---------------------------------------------------------------------------

async function createAttemptOverride(overrideData) {
  const { quiz_id, user_id, granted_by, attempts_granted, reason, expires_at } = overrideData;
  const [result] = await db.query(
    `INSERT INTO quiz_attempt_overrides (quiz_id, user_id, granted_by, attempts_granted, reason, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [quiz_id, user_id, granted_by, attempts_granted, reason ?? null, expires_at ?? null]
  );
  return result.insertId;
}

async function getActiveOverrides(quizId, userId) {
  const [rows] = await db.query(
    `SELECT * FROM quiz_attempt_overrides
     WHERE quiz_id = ? AND user_id = ?
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [quizId, userId]
  );
  return rows;
}

async function sumGrantedOverrides(quizId, userId) {
  const [[{ total }]] = await db.query(
    `SELECT COALESCE(SUM(attempts_granted), 0) AS total FROM quiz_attempt_overrides
     WHERE quiz_id = ? AND user_id = ? AND (expires_at IS NULL OR expires_at > NOW())`,
    [quizId, userId]
  );
  return total || 0;
}

async function listOverrides(filters = {}) {
  const { quiz_id, user_id, granted_by } = filters;
  let sql = `SELECT o.*, u.full_name AS granted_by_name FROM quiz_attempt_overrides o
             JOIN users u ON o.granted_by = u.id WHERE 1=1`;
  const params = [];
  if (quiz_id) {
    sql += ' AND o.quiz_id = ?';
    params.push(quiz_id);
  }
  if (user_id) {
    sql += ' AND o.user_id = ?';
    params.push(user_id);
  }
  if (granted_by) {
    sql += ' AND o.granted_by = ?';
    params.push(granted_by);
  }
  sql += ' ORDER BY o.created_at DESC';
  const [rows] = await db.query(sql, params);
  return rows;
}

async function revokeOverride(id) {
  const [result] = await db.query('DELETE FROM quiz_attempt_overrides WHERE id = ?', [id]);
  return result.affectedRows;
}

// ---------------------------------------------------------------------------
// Backward-compatible submission helpers (kept for existing progress check)
// ---------------------------------------------------------------------------

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
      let val = updates[key];
      if (key === 'answers') val = val ? JSON.stringify(val) : null;
      sets.push(`${key} = ?`);
      params.push(val);
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

async function getMyQuizzes(userId, role, courseId, businessId, scopedDepartmentIds) {
  const adminRoles = ['super_admin', 'admin', 'department_head'];
  const courseFilter = courseId ? ' AND q.course_id = ?' : '';
  const courseParam = courseId ? [courseId] : [];

  if (role === 'super_admin') {
    const [rows] = await db.query(
      `SELECT q.*, c.title AS course_title, c.id AS course_id
       FROM quizzes q
       JOIN courses c ON q.course_id = c.id
       WHERE q.is_deleted = FALSE AND q.status = 'published'${courseFilter}
       ORDER BY q.created_at DESC`,
      courseParam
    );
    return rows;
  }

  if (role === 'admin') {
    if (!businessId) {
      return [];
    }
    const [rows] = await db.query(
      `SELECT q.*, c.title AS course_title, c.id AS course_id
       FROM quizzes q
       JOIN courses c ON q.course_id = c.id
       LEFT JOIN departments d ON c.department_id = d.id
       WHERE q.is_deleted = FALSE AND q.status = 'published'${courseFilter}
         AND d.business_id = ?
       ORDER BY q.created_at DESC`,
      [...courseParam, businessId]
    );
    return rows;
  }

  if (role === 'department_head') {
    const deptIds = Array.isArray(scopedDepartmentIds) ? scopedDepartmentIds.filter(Boolean) : [];
    if (!deptIds.length) {
      return [];
    }
    const placeholders = deptIds.map(() => '?').join(',');
    const [rows] = await db.query(
      `SELECT q.*, c.title AS course_title, c.id AS course_id
       FROM quizzes q
       JOIN courses c ON q.course_id = c.id
       WHERE q.is_deleted = FALSE AND q.status = 'published'${courseFilter}
         AND c.department_id IN (${placeholders})
       ORDER BY q.created_at DESC`,
      [...courseParam, ...deptIds]
    );
    return rows;
  }

  const [rows] = await db.query(
    `SELECT q.*, c.title AS course_title, c.id AS course_id
     FROM quizzes q
     JOIN courses c ON q.course_id = c.id
     LEFT JOIN course_enrollments ce ON ce.course_id = c.id AND ce.user_id = ? AND ce.status = 'active' AND ce.is_deleted = FALSE
     WHERE q.is_deleted = FALSE AND q.status = 'published'${courseFilter}
       AND (ce.user_id IS NOT NULL OR c.instructor_id = ?)
     ORDER BY q.created_at DESC`,
    [userId, userId, ...courseParam]
  );
  return rows;
}

async function getQuizAttempts(quizId) {
  const [rows] = await db.query(
    `SELECT a.*, u.full_name AS user_name, u.email AS user_email
     FROM quiz_attempts a
     JOIN users u ON a.user_id = u.id
     WHERE a.quiz_id = ? AND a.is_deleted = FALSE AND a.status IN ('completed','graded')
     ORDER BY a.score DESC, a.time_taken_sec ASC, a.attempt_number ASC`,
    [quizId]
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
  findByIdIgnoringDelete,
  listAllQuizzes,
  create,
  update,
  softDelete,
  hardDelete,
  softDeleteByCourse,
  listQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  createQuestionBank,
  getQuestionBanks,
  getQuestionBank,
  deleteQuestionBank,
  getQuizWithQuestions,
  getActiveAttempt,
  countCompletedAttempts,
  getBestAttempt,
  getMaxAttemptNumber,
  createAttempt,
  getAttempt,
  updateAttempt,
  listAttempts,
  createResult,
  getAttemptResults,
  getQuizResultsForUser,
  logViolation,
  getViolations,
  getViolationsByUser,
  getViolationsForUser,
  countViolations,
  incrementAttemptViolationCount,
  getLeaderboard,
  getCourseLeaderboard,
  getFlaggedAttempts,
  createAttemptOverride,
  getActiveOverrides,
  sumGrantedOverrides,
  listOverrides,
  revokeOverride,
  createSubmission,
  updateSubmission,
  getUserSubmissions,
  getQuizResults,
  getQuizAttempts,
  getMyQuizzes,
};

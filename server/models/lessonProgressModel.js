const db = require('../config/database');

const LESSON_STATUSES = ['locked', 'unlocked', 'in_progress', 'completed'];

async function listByCourse(userId, courseId) {
  const [rows] = await db.query(
    `SELECT lp.*, mc.title AS lesson_title, mc.type AS lesson_type, mc.order_index AS lesson_order, mc.module_id, cm.order_index AS module_order
     FROM lesson_progress lp
     JOIN module_content mc ON lp.lesson_id = mc.id
     JOIN course_modules cm ON mc.module_id = cm.id
     WHERE lp.user_id = ? AND lp.course_id = ? AND mc.is_deleted = FALSE AND cm.is_deleted = FALSE
     ORDER BY cm.order_index ASC, mc.order_index ASC, lp.id ASC`,
    [userId, courseId]
  );
  return rows;
}

async function findByUserAndLesson(userId, lessonId) {
  const [rows] = await db.query(
    'SELECT * FROM lesson_progress WHERE user_id = ? AND lesson_id = ? LIMIT 1',
    [userId, lessonId]
  );
  return rows[0] || null;
}

async function upsert({ userId, lessonId, courseId, status, completedAt }) {
  const now = new Date();
  const [rows] = await db.query(
    `INSERT INTO lesson_progress (user_id, lesson_id, course_id, status, completed_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status), completed_at = VALUES(completed_at), updated_at = VALUES(updated_at)`,
    [userId, lessonId, courseId, status || 'locked', completedAt || null, now, now]
  );
  return rows.insertId || rows.affectedRows;
}

async function bulkInitialize(userId, courseId, lessonIds) {
  if (!lessonIds.length) return [];
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const inserted = [];
    for (const lessonId of lessonIds) {
      const status = lessonId === lessonIds[0] ? 'unlocked' : 'locked';
      const [result] = await conn.query(
        'INSERT INTO lesson_progress (user_id, lesson_id, course_id, status) VALUES (?, ?, ?, ?)',
        [userId, lessonId, courseId, status]
      );
      inserted.push(result.insertId);
    }
    await conn.commit();
    return inserted;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getNextLessonId(userId, courseId, currentLessonId) {
  const [rows] = await db.query(
    `SELECT mc.id FROM module_content mc
     JOIN course_modules cm ON mc.module_id = cm.id
     LEFT JOIN lesson_progress lp ON lp.lesson_id = mc.id AND lp.user_id = ?
     WHERE cm.course_id = ? AND mc.is_deleted = FALSE AND cm.is_deleted = FALSE
       AND (
         (mc.module_id = (SELECT module_id FROM module_content WHERE id = ? LIMIT 1)
          AND mc.order_index > (SELECT order_index FROM module_content WHERE id = ? LIMIT 1))
         OR
         (cm.order_index > (SELECT order_index FROM course_modules WHERE id = (SELECT module_id FROM module_content WHERE id = ? LIMIT 1) LIMIT 1))
       )
     ORDER BY cm.order_index ASC, mc.order_index ASC
     LIMIT 1`,
    [userId, courseId, currentLessonId, currentLessonId, currentLessonId]
  );
  return rows[0]?.id || null;
}

async function getFirstLessonId(courseId) {
  const [rows] = await db.query(
    `SELECT mc.id FROM module_content mc
     JOIN course_modules cm ON mc.module_id = cm.id
     WHERE cm.course_id = ? AND mc.is_deleted = FALSE AND cm.is_deleted = FALSE
     ORDER BY cm.order_index ASC, mc.order_index ASC
     LIMIT 1`,
    [courseId]
  );
  return rows[0]?.id || null;
}

async function countCompleted(userId, courseId) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS completed FROM lesson_progress
     WHERE user_id = ? AND course_id = ? AND status = 'completed'`,
    [userId, courseId]
  );
  return row?.completed ?? 0;
}

async function countTotal(courseId) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS total FROM module_content mc
     JOIN course_modules cm ON mc.module_id = cm.id
     WHERE cm.course_id = ? AND mc.is_deleted = FALSE AND cm.is_deleted = FALSE`,
    [courseId]
  );
  return row?.total ?? 0;
}

async function isModuleCompleted(userId, moduleId) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS total FROM module_content mc
     WHERE mc.module_id = ? AND mc.is_deleted = FALSE`,
    [moduleId]
  );
  const total = row?.total ?? 0;
  if (total === 0) return false;
  const [[completedRow]] = await db.query(
    `SELECT COUNT(*) AS completed FROM lesson_progress lp
     JOIN module_content mc ON lp.lesson_id = mc.id
     WHERE lp.user_id = ? AND mc.module_id = ? AND lp.status = 'completed' AND mc.is_deleted = FALSE`,
    [userId, moduleId]
  );
  return (completedRow?.completed ?? 0) >= total;
}

async function listModuleStatuses(userId, courseId) {
  const [modules] = await db.query(
    `SELECT cm.id FROM course_modules cm WHERE cm.course_id = ? AND cm.is_deleted = FALSE ORDER BY cm.order_index ASC`,
    [courseId]
  );
  const out = new Map();
  for (const mod of modules) {
    const completed = await isModuleCompleted(userId, mod.id);
    out.set(mod.id, { moduleId: mod.id, completed });
  }
  return out;
}

async function markCompleted(conn, userId, lessonId, courseId) {
  const now = new Date();
  const [result] = await conn.query(
    'UPDATE lesson_progress SET status = ?, completed_at = ?, updated_at = ? WHERE user_id = ? AND lesson_id = ?',
    ['completed', now, now, userId, lessonId]
  );
  return result.affectedRows;
}

async function unlock(conn, userId, lessonId, courseId) {
  const now = new Date();
  const [result] = await conn.query(
    'INSERT INTO lesson_progress (user_id, lesson_id, course_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, lessonId, courseId, 'unlocked', now, now]
  );
  return result.insertId;
}

async function getModuleOfLesson(lessonId) {
  const [rows] = await db.query(
    'SELECT module_id FROM module_content WHERE id = ? LIMIT 1',
    [lessonId]
  );
  return rows[0]?.module_id || null;
}

async function getFirstLessonIdOfModule(moduleId) {
  const [rows] = await db.query(
    `SELECT mc.id FROM module_content mc
     WHERE mc.module_id = ? AND mc.is_deleted = FALSE
     ORDER BY mc.order_index ASC
     LIMIT 1`,
    [moduleId]
  );
  return rows[0]?.id || null;
}

async function getNextModuleId(courseId, currentModuleId) {
  const [rows] = await db.query(
    `SELECT cm.id FROM course_modules cm
     WHERE cm.course_id = ? AND cm.is_deleted = FALSE AND cm.order_index > (SELECT order_index FROM course_modules WHERE id = ? LIMIT 1)
     ORDER BY cm.order_index ASC
     LIMIT 1`,
    [courseId, currentModuleId]
  );
  return rows[0]?.id || null;
}

module.exports = {
  db,
  LESSON_STATUSES,
  listByCourse,
  findByUserAndLesson,
  upsert,
  bulkInitialize,
  getNextLessonId,
  getFirstLessonId,
  countCompleted,
  countTotal,
  markCompleted,
  unlock,
  isModuleCompleted,
  listModuleStatuses,
  getModuleOfLesson,
  getFirstLessonIdOfModule,
  getNextModuleId,
};

const db = require('../config/database');

async function createSession({ acknowledgementId, userId, sopVersionId }) {
  const [result] = await db.query(
    `INSERT INTO sop_onboarding_sessions (acknowledgement_id, user_id, sop_version_id)
     VALUES (?, ?, ?)`,
    [acknowledgementId, userId, sopVersionId]
  );
  return findById(result.insertId);
}

async function findById(id) {
  const [rows] = await db.query('SELECT * FROM sop_onboarding_sessions WHERE id = ?', [id]);
  return rows[0] || null;
}

async function findActiveByUserAndVersion(userId, sopVersionId) {
  const [rows] = await db.query(
    `SELECT * FROM sop_onboarding_sessions
     WHERE user_id = ? AND sop_version_id = ? AND completed_at IS NULL
     ORDER BY id DESC LIMIT 1`,
    [userId, sopVersionId]
  );
  return rows[0] || null;
}

async function findByIdAndUser(id, userId) {
  const [rows] = await db.query(
    'SELECT * FROM sop_onboarding_sessions WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return rows[0] || null;
}

async function heartbeat(id, userId, secondsToAdd) {
  const [result] = await db.query(
    `UPDATE sop_onboarding_sessions
     SET total_seconds = total_seconds + ?,
         last_heartbeat_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ? AND completed_at IS NULL`,
    [Math.max(0, Math.floor(secondsToAdd || 0)), id, userId]
  );
  return result.affectedRows > 0;
}

async function markMinTimeMet(id, userId) {
  const [result] = await db.query(
    `UPDATE sop_onboarding_sessions
     SET min_time_met = 1
     WHERE id = ? AND user_id = ? AND completed_at IS NULL`,
    [id, userId]
  );
  return result.affectedRows > 0;
}

async function completeSession(id, userId) {
  const [result] = await db.query(
    `UPDATE sop_onboarding_sessions
     SET completed_at = CURRENT_TIMESTAMP,
         min_time_met = 1
     WHERE id = ? AND user_id = ? AND completed_at IS NULL`,
    [id, userId]
  );
  return result.affectedRows > 0;
}

async function listPendingForUser(userId) {
  const [rows] = await db.query(
    `SELECT s.id, s.acknowledgement_id, s.sop_version_id, s.total_seconds, s.min_time_met, s.completed_at
     FROM sop_onboarding_sessions s
     WHERE s.user_id = ? AND s.completed_at IS NULL
     ORDER BY s.created_at ASC`,
    [userId]
  );
  return rows;
}

async function getOrCreateSession(acknowledgementId, userId, sopVersionId) {
  const existing = await findActiveByUserAndVersion(userId, sopVersionId);
  if (existing) return existing;

  return createSession({ acknowledgementId, userId, sopVersionId });
}

module.exports = {
  createSession,
  findById,
  findActiveByUserAndVersion,
  findByIdAndUser,
  heartbeat,
  markMinTimeMet,
  completeSession,
  listPendingForUser,
  getOrCreateSession,
};

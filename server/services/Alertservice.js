const pool = require('../config/database');

/**
 * Resolves the users.id and their role for a given reservist or direct user.
 * Returns { userId, role } or null if nothing can be resolved.
 */
async function resolveUserContext(executor, { reservistId, directUserId }) {
  // Path A: reservistId given — look up the linked user
  if (reservistId) {
    const [rows] = await executor.query(
      `SELECT u.id AS user_id, u.role
       FROM reservists r
       JOIN users u ON u.id = r.user_id
       WHERE r.id = ?
       LIMIT 1`,
      [reservistId]
    );
    if (rows.length > 0) return { userId: rows[0].user_id, role: rows[0].role };
    console.warn(`[alertService] No user linked to reservist ${reservistId} — trying directUserId`);
  }

  // Path B: directUserId given — look up their role directly
  if (directUserId) {
    const [rows] = await executor.query(
      'SELECT id AS user_id, role FROM users WHERE id = ? LIMIT 1',
      [directUserId]
    );
    if (rows.length > 0) return { userId: rows[0].user_id, role: rows[0].role };
  }

  return null;
}

/**
 * Maps a users.role to the alerts.target_role enum value.
 * Admin variants map to 'admin'; reservists map to 'reservist'.
 */
function resolveTargetRole(role) {
  if (!role) return 'reservist';
  if (role === 'admin' || role.startsWith('admin_')) return 'admin';
  return 'reservist';
}

/**
 * Creates a training alert visible ONLY to the specific user.
 *
 * Works for reservists AND all admin role variants
 * (admin, admin_arsen, admin_group, admin_squadron).
 *
 * @param {Object|null} conn        - Active DB connection or null to use pool
 * @param {Object} params
 * @param {'training_assigned_internal'|'training_registered_external'} params.alertType
 * @param {number}  [params.reservistId]   - reservists.id (for reservist flow)
 * @param {number}  [params.directUserId]  - users.id (for admin / known-user flow)
 * @param {number}  params.trainingId
 * @param {'internal'|'external'} params.trainingType
 * @param {string}  params.trainingTitle
 */
async function createTrainingAlertForUser(conn, params) {
  const executor = conn || pool;
  const { alertType, reservistId, directUserId, trainingId, trainingType, trainingTitle } = params;

  // ── Validate required params ─────────────────────────────────────────────
  if (!alertType || !trainingId || !trainingType || !trainingTitle) {
    throw new Error('[alertService] Missing required params');
  }
  if (!reservistId && !directUserId) {
    // Nothing to notify — not an error, just skip silently
    return null;
  }

  // ── Resolve who receives this alert ─────────────────────────────────────
  const userCtx = await resolveUserContext(executor, { reservistId, directUserId });
  if (!userCtx) {
    console.warn(`[alertService] Could not resolve user for reservistId=${reservistId}, directUserId=${directUserId} — skipping`);
    return null;
  }
  const { userId, role } = userCtx;
  const targetRole = resolveTargetRole(role);

  // ── Idempotency key ──────────────────────────────────────────────────────
  // Stable per (alertType, trainingType, trainingId, userId)
  const entityType = `${trainingType}_training_participant`;
  const entityId   = `${trainingType}_${trainingId}_user_${userId}`;

  const [existing] = await executor.query(
    'SELECT id FROM alerts WHERE alert_type = ? AND entity_type = ? AND entity_id = ? LIMIT 1',
    [alertType, entityType, entityId]
  );
  if (existing.length > 0) return existing[0].id; // already sent — idempotent

  // ── Build human-readable content ─────────────────────────────────────────
  let title, message;
  if (alertType === 'training_assigned_internal') {
    title   = `Training Assignment: ${trainingTitle}`;
    message = `You have been assigned to participate in: ${trainingTitle}`;
  } else if (alertType === 'training_registered_external') {
    title   = `Training Registration: ${trainingTitle}`;
    message = `You have successfully registered for: ${trainingTitle}`;
  } else {
    throw new Error(`[alertService] Unknown alertType: ${alertType}`);
  }

  // ── Insert the alert ─────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);

  const [insertResult] = await executor.query(
    `INSERT INTO alerts
       (title, message, alert_type, entity_type, entity_id,
        target_role, is_active, start_date, created_by)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, NULL)`,
    [title, message, alertType, entityType, entityId, targetRole, today]
  );
  const alertId = insertResult.insertId;

  // ── Link to only this user ───────────────────────────────────────────────
  await executor.query(
    `INSERT INTO user_alerts (user_id, alert_id, is_read)
     VALUES (?, ?, 0)
     ON DUPLICATE KEY UPDATE alert_id = alert_id`,
    [userId, alertId]
  );

  return alertId;
}

/**
 * Fire-and-forget wrapper — logs errors but never throws.
 * Always use this from service/controller code so a failed alert
 * never rolls back or blocks the parent transaction.
 */
async function sendTrainingAlertSafe(conn, params) {
  try {
    await createTrainingAlertForUser(conn, params);
  } catch (err) {
    console.error('[alertService] Non-fatal alert failure:', err.message);
    // intentionally swallowed
  }
}

module.exports = {
  createTrainingAlertForUser,
  sendTrainingAlertSafe,
};
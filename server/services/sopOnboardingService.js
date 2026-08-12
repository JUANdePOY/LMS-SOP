const db = require('../config/database');
const sopAcknowledgementService = require('./sopAcknowledgementService');
const { logAudit } = require('../utils/auditLogger');

async function getDefaultOnboardingSops(actorId) {
  let businessFilter = '';
  const params = [];

  if (actorId) {
    const [userRows] = await db.query(
      'SELECT business_id FROM users WHERE id = ? AND is_active = TRUE',
      [actorId]
    );
    const user = userRows[0];
    if (user && user.business_id) {
      businessFilter = 'AND s.business_id = ?';
      params.push(user.business_id);
    }
  }

  const [rows] = await db.query(`
    SELECT s.id AS sop_id, s.sop_code, s.title, s.status,
           v.id AS version_id, v.version
    FROM sops s
    JOIN sop_versions v ON v.sop_id = s.id AND v.is_current = 1
    WHERE s.is_default_onboarding = 1
      AND s.deleted_at IS NULL
      AND s.status = 'Published'
      AND v.status = 'Published'
      ${businessFilter}
    ORDER BY s.title ASC
  `, params);
  return rows;
}

async function assignOnboardingSopsToUser(userId, actorId) {
  const defaultSops = await getDefaultOnboardingSops(actorId);
  if (defaultSops.length === 0) return { assigned: 0 };

  const values = defaultSops.map(sop => [sop.version_id, userId, 'Pending']);
  const [result] = await db.query(
    `INSERT INTO sop_acknowledgements (sop_version_id, user_id, status)
     VALUES ?`,
    [values]
  );

  if (result.affectedRows > 0) {
    logAudit({
      user_id: actorId || userId,
      action: 'onboarding.sops_assigned',
      entity_type: 'user',
      entity_id: userId,
      metadata: { count: result.affectedRows }
    });
  }

  return { assigned: result.affectedRows };
}

async function getPendingOnboardingSops(userId, actorId) {
  let businessFilter = '';
  const params = [userId];

  if (actorId) {
    const [userRows] = await db.query(
      'SELECT business_id FROM users WHERE id = ? AND is_active = TRUE',
      [actorId]
    );
    const actor = userRows[0];
    if (actor && actor.business_id) {
      businessFilter = 'AND s.business_id = ?';
      params.push(actor.business_id);
    }
  }

  const [rows] = await db.query(`
    SELECT a.id AS acknowledgement_id,
           s.id AS sop_id,
           s.sop_code,
           s.title,
           s.description,
           v.version,
           v.id AS version_id,
           a.status,
           a.acknowledged_at,
           a.created_at AS assigned_at,
           m.id AS module_id,
           m.title AS module_title,
           m.content AS module_content,
           m.sort_order AS module_sort_order
    FROM sop_acknowledgements a
    JOIN sop_versions v ON v.id = a.sop_version_id
    JOIN sops s ON s.id = v.sop_id
    LEFT JOIN sop_modules m ON m.sop_id = s.id AND m.sop_version_id = v.id AND (m.deleted_at IS NULL OR m.is_deleted = 0)
    WHERE a.user_id = ?
      AND a.status = 'Pending'
      AND s.deleted_at IS NULL
      ${businessFilter}
    ORDER BY a.created_at ASC, m.sort_order ASC, m.id ASC
  `, params);

  // Group modules by SOP
  const sopsMap = new Map();
  for (const row of rows) {
    if (!sopsMap.has(row.acknowledgement_id)) {
      sopsMap.set(row.acknowledgement_id, {
        acknowledgement_id: row.acknowledgement_id,
        sop_id: row.sop_id,
        sop_code: row.sop_code,
        title: row.title,
        description: row.description,
        version: row.version,
        version_id: row.version_id,
        status: row.status,
        acknowledged_at: row.acknowledged_at,
        assigned_at: row.assigned_at,
        modules: [],
      });
    }
    if (row.module_id) {
      sopsMap.get(row.acknowledgement_id).modules.push({
        id: row.module_id,
        title: row.module_title,
        content: row.module_content,
        sort_order: row.module_sort_order,
      });
    }
  }

  return Array.from(sopsMap.values());
}

async function isOnboardingComplete(userId) {
  const [rows] = await db.query(`
    SELECT COUNT(*) AS pending_count
    FROM sop_acknowledgements a
    JOIN sop_versions v ON v.id = a.sop_version_id
    JOIN sops s ON s.id = v.sop_id
    WHERE a.user_id = ?
      AND a.status = 'Pending'
      AND s.is_default_onboarding = 1
      AND s.deleted_at IS NULL
  `, [userId]);
  return (rows[0]?.pending_count || 0) === 0;
}

async function acknowledgeOnboardingSop(ackId, userId) {
  const [rows] = await db.query(
    `SELECT id, status FROM sop_acknowledgements
     WHERE id = ? AND user_id = ? AND status = 'Pending'
     FOR UPDATE`,
    [ackId, userId]
  );

  if (rows.length === 0) {
    const err = new Error('Onboarding SOP not found or already acknowledged');
    err.code = 'NOT_FOUND';
    throw err;
  }

  await db.query(
    `UPDATE sop_acknowledgements
     SET status = 'Acknowledged', acknowledged_at = NOW()
     WHERE id = ?`,
    [ackId]
  );

  logAudit({
    user_id: userId,
    action: 'onboarding.acknowledged',
    entity_type: 'sop_acknowledgement',
    entity_id: ackId
  });

  return { success: true };
}

module.exports = {
  getDefaultOnboardingSops,
  assignOnboardingSopsToUser,
  getPendingOnboardingSops,
  isOnboardingComplete,
  acknowledgeOnboardingSop,
};
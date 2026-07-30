const db = require('../config/database');

async function listBySop(sopId) {
  const [rows] = await db.query(`
    SELECT sal.*, u.full_name AS user_name
    FROM sop_audit_logs sal
    LEFT JOIN users u ON sal.performed_by = u.id
    WHERE sal.entity_id IN (
      SELECT sv.id FROM sop_versions sv WHERE sv.sop_id = ?
      UNION
      SELECT s.id FROM sops s WHERE s.id = ?
    )
    OR sal.entity_type = 'sop' AND sal.entity_id = ?
    ORDER BY sal.created_at DESC
  `, [sopId, sopId, sopId]);
  return rows;
}

async function listByVersion(versionId) {
  const [rows] = await db.query(`
    SELECT sal.*, u.full_name AS user_name
    FROM sop_audit_logs sal
    LEFT JOIN users u ON sal.performed_by = u.id
    WHERE sal.entity_type = 'sop_version' AND sal.entity_id = ?
    ORDER BY sal.created_at DESC
  `, [versionId]);
  return rows;
}

async function createEntry(data) {
  const { public_id, entity_type, entity_id, action, performed_by, old_values, new_values } = data;
  const [result] = await db.query(`
    INSERT INTO sop_audit_logs (public_id, entity_type, entity_id, action, performed_by, old_values, new_values, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [public_id || null, entity_type, entity_id, action, performed_by || null, old_values || null, new_values || null]);
  return result.insertId;
}

module.exports = {
  listBySop,
  listByVersion,
  createEntry,
};
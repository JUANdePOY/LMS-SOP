const db = require('../config/database');

async function listByVersion(versionId) {
  const [rows] = await db.query(`
    SELECT scl.*, u.full_name AS user_name
    FROM sop_change_logs scl
    LEFT JOIN users u ON scl.changed_by = u.id
    WHERE scl.sop_version_id = ?
    ORDER BY scl.changed_at DESC
  `, [versionId]);
  return rows;
}

async function listBySop(sopId) {
  const [rows] = await db.query(`
    SELECT scl.*, u.full_name AS user_name, sv.version AS version_number
    FROM sop_change_logs scl
    INNER JOIN sop_versions sv ON scl.sop_version_id = sv.id
    LEFT JOIN users u ON scl.changed_by = u.id
    WHERE sv.sop_id = ?
    ORDER BY scl.changed_at DESC
  `, [sopId]);
  return rows;
}

async function createEntry(data) {
  const { sop_version_id, field_name, old_value, new_value, changed_by } = data;
  const [result] = await db.query(`
    INSERT INTO sop_change_logs (sop_version_id, field_name, old_value, new_value, changed_by, changed_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [sop_version_id, field_name, old_value, new_value, changed_by || null]);
  return result.insertId;
}

module.exports = {
  listByVersion,
  listBySop,
  createEntry,
};
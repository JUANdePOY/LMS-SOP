const db = require('../config/database');

// The database table is `audit_logs` (not `sop_audit_logs`).
// Column layout: id, user_id, action, entity_type, entity_id, metadata, ip_address, user_agent, created_at
// We join with `users` to get user_name.

async function listBySop(sopId) {
  const [rows] = await db.query(
    `
      SELECT a.*, u.full_name AS user_name
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.entity_type = 'sop' AND a.entity_id = ?
      OR (
        a.entity_type IN ('sop_section', 'sop_step', 'sop_document')
        AND JSON_EXTRACT(a.metadata, '$.sop_id') = ?
      )
      OR (
        a.entity_type = 'sop_version'
        AND a.entity_id IN (SELECT id FROM sop_versions WHERE sop_id = ?)
      )
      ORDER BY a.created_at DESC
    `,
    [sopId, sopId, sopId]
  );
  return rows;
}

async function listByVersion(versionId) {
  const [rows] = await db.query(
    `
      SELECT a.*, u.full_name AS user_name
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.entity_type = 'sop_version' AND a.entity_id = ?
      ORDER BY a.created_at DESC
    `,
    [versionId]
  );
  return rows;
}

async function createEntry(data) {
  const { entity_type, entity_id, action, performed_by, old_values, new_values } = data;
  const metadata = {};
  if (old_values) metadata.old_values = old_values;
  if (new_values) metadata.new_values = new_values;

  const [result] = await db.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [performed_by || null, action, entity_type, entity_id, JSON.stringify(metadata)]
  );
  return result.insertId;
}

module.exports = {
  listBySop,
  listByVersion,
  createEntry,
};

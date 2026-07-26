const db = require('../config/database');

async function listShares(sopId) {
  const [rows] = await db.query('SELECT * FROM sop_shares WHERE sop_id = ? AND is_deleted = FALSE ORDER BY created_at DESC', [sopId]);
  return rows;
}

async function createShare(data) {
  const { sop_id, share_type, share_with, permissions, created_by } = data;
  const [result] = await db.query(`
    INSERT INTO sop_shares (sop_id, share_type, share_with, permissions, created_by, is_deleted, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [sop_id, share_type || 'internal', share_with || null, permissions || 'view', created_by || null]);
  return result.insertId;
}

module.exports = {
  listShares,
  createShare,
};

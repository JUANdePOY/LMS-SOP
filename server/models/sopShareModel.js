const db = require('../config/database');
const crypto = require('crypto');

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

async function createShareLink(data) {
  const token = crypto.randomBytes(32).toString('hex');
  const { sop_id, share_type, permissions, created_by, expires_at } = data;
  const [result] = await db.query(`
    INSERT INTO sop_shares (sop_id, share_type, token, permissions, created_by, expires_at, is_deleted, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [sop_id, share_type, token, permissions || 'view', created_by, expires_at || null]);
  return { id: result.insertId, token };
}

async function findByToken(token) {
  const [rows] = await db.query(`
    SELECT ss.*, s.title AS sop_title, s.public_id AS sop_public_id
    FROM sop_shares ss
    JOIN sops s ON ss.sop_id = s.id
    WHERE ss.token = ? AND ss.is_deleted = FALSE AND (ss.expires_at IS NULL OR ss.expires_at > NOW())
  `, [token]);
  return rows[0] || null;
}

async function revokeShare(id) {
  await db.query('UPDATE sop_shares SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
}

module.exports = {
  listShares,
  createShare,
  createShareLink,
  findByToken,
  revokeShare,
};

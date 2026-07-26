const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const uploadDir = path.join(__dirname, '..', 'uploads', 'sops');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

async function listBySop(sopId) {
  const [rows] = await db.query('SELECT * FROM sop_documents WHERE sop_id = ? AND is_deleted = FALSE ORDER BY created_at DESC', [sopId]);
  return rows;
}

async function createAttachment(data) {
  const { sop_id, file_name, original_name, mime_type, file_size, storage_path, uploaded_by, document_type } = data;
  const [result] = await db.query(`
    INSERT INTO sop_documents (
      sop_id, file_name, original_name, mime_type, file_size, storage_path, uploaded_by, document_type, is_deleted, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [sop_id, file_name, original_name, mime_type, file_size, storage_path, uploaded_by || null, document_type || 'PDF']);
  return result.insertId;
}

async function deleteAttachment(id) {
  const [rows] = await db.query('SELECT storage_path FROM sop_documents WHERE id = ? AND is_deleted = FALSE', [id]);
  const attachment = rows[0];
  const [result] = await db.query('UPDATE sop_documents SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  if (attachment?.storage_path) {
    const absPath = path.isAbsolute(attachment.storage_path) ? attachment.storage_path : path.join(__dirname, '..', attachment.storage_path);
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }
  }
  return result.affectedRows;
}

module.exports = {
  listBySop,
  createAttachment,
  deleteAttachment,
  uploadDir,
};

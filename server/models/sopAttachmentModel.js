const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const { getCurrentVersionId, ensureCurrentVersion } = require('./sopVersionModel');

const uploadDir = path.join(__dirname, '..', 'uploads', 'sops');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Real schema: sop_documents(id, sop_version_id, filename, original_name,
// storage_path, mime_type, file_size, document_type NOT NULL, display_order,
// uploaded_by, created_at, deleted_at) — keyed off sop_version_id, column
// is `filename` (not file_name), soft delete is deleted_at (not is_deleted).

async function listBySop(sopId) {
  const versionId = await getCurrentVersionId(sopId);
  if (!versionId) return [];
  const [rows] = await db.query(
    'SELECT * FROM sop_documents WHERE sop_version_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
    [versionId],
  );
  return rows;
}

async function createAttachment(data) {
  const { sop_id, file_name, original_name, mime_type, file_size, storage_path, uploaded_by, document_type } = data;
  const versionId = await ensureCurrentVersion(sop_id, uploaded_by);
  const [result] = await db.query(`
    INSERT INTO sop_documents (
      sop_version_id, filename, original_name, mime_type, file_size, storage_path, uploaded_by, document_type, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [versionId, file_name, original_name, mime_type, file_size, storage_path, uploaded_by || null, document_type || 'PDF']);
  return result.insertId;
}

async function deleteAttachment(id) {
  const [rows] = await db.query('SELECT storage_path FROM sop_documents WHERE id = ? AND deleted_at IS NULL', [id]);
  const attachment = rows[0];
  const [result] = await db.query('UPDATE sop_documents SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
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
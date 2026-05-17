const db = require('../config/database');
const pool = db.promise();

const KIND_LETTER_ORDER = 'letter_order';

async function listByExternalTrainingId(externalTrainingId) {
  const [rows] = await pool.query(
    `SELECT id, external_training_id, kind, original_filename, mime_type, size_bytes, storage_backend, created_at, uploaded_by
     FROM external_training_attachments
     WHERE external_training_id = ?
     ORDER BY created_at DESC, id DESC`,
    [externalTrainingId]
  );
  return rows;
}

async function findByIdForExternalTraining(attachmentId, externalTrainingId) {
  const [rows] = await pool.query(
    `SELECT id, external_training_id, kind, stored_filename, original_filename, mime_type, size_bytes, storage_backend, relative_path, created_at, uploaded_by
     FROM external_training_attachments
     WHERE id = ? AND external_training_id = ?`,
    [attachmentId, externalTrainingId]
  );
  return rows[0] || null;
}

async function listAllRelativePathsForExternalTraining(externalTrainingId) {
  const [rows] = await pool.query(
    `SELECT relative_path FROM external_training_attachments WHERE external_training_id = ?`,
    [externalTrainingId]
  );
  return rows.map((r) => r.relative_path);
}

async function deleteByExternalTrainingAndKind(conn, externalTrainingId, kind) {
  const sql = 'DELETE FROM external_training_attachments WHERE external_training_id = ? AND kind = ?';
  const executor = conn || pool;
  const [result] = await executor.query(sql, [externalTrainingId, kind]);
  return result.affectedRows;
}

async function insert(conn, row) {
  const sql = `
    INSERT INTO external_training_attachments (
      external_training_id, kind, stored_filename, original_filename, mime_type, size_bytes, storage_backend, relative_path, uploaded_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    row.external_training_id,
    row.kind || KIND_LETTER_ORDER,
    row.stored_filename,
    row.original_filename,
    row.mime_type,
    row.size_bytes,
    row.storage_backend || 'local',
    row.relative_path,
    row.uploaded_by ?? null,
  ];
  const executor = conn || pool;
  const [result] = await executor.query(sql, params);
  return result.insertId;
}

module.exports = {
  KIND_LETTER_ORDER,
  listByExternalTrainingId,
  findByIdForExternalTraining,
  listAllRelativePathsForExternalTraining,
  deleteByExternalTrainingAndKind,
  insert,
};

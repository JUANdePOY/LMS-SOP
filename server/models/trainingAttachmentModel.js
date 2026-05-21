const db = require('../config/database');
const pool = db;

const KIND_LETTER_ORDER = 'letter_order';

async function listByTrainingId(trainingId) {
  const [rows] = await pool.query(
    `SELECT id, training_id, kind, original_filename, mime_type, size_bytes, storage_backend, created_at, uploaded_by
     FROM internal_training_attachments
     WHERE training_id = ?
     ORDER BY created_at DESC, id DESC`,
    [trainingId]
  );
  return rows;
}

async function findByIdForTraining(attachmentId, trainingId) {
  const [rows] = await pool.query(
    `SELECT id, training_id, kind, stored_filename, original_filename, mime_type, size_bytes, storage_backend, relative_path, created_at, uploaded_by
     FROM internal_training_attachments
     WHERE id = ? AND training_id = ?`,
    [attachmentId, trainingId]
  );
  return rows[0] || null;
}

async function listAllRelativePathsForTraining(trainingId) {
  const [rows] = await pool.query(`SELECT relative_path FROM internal_training_attachments WHERE training_id = ?`, [
    trainingId,
  ]);
  return rows.map((r) => r.relative_path);
}

async function deleteByTrainingAndKind(conn, trainingId, kind) {
  const sql = 'DELETE FROM internal_training_attachments WHERE training_id = ? AND kind = ?';
  const executor = conn || pool;
  const [result] = await executor.query(sql, [trainingId, kind]);
  return result.affectedRows;
}

async function insert(conn, row) {
  const sql = `
    INSERT INTO internal_training_attachments (
      training_id, kind, stored_filename, original_filename, mime_type, size_bytes, storage_backend, relative_path, uploaded_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    row.training_id,
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
  listByTrainingId,
  findByIdForTraining,
  listAllRelativePathsForTraining,
  deleteByTrainingAndKind,
  insert,
};

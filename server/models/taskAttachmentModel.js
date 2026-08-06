const db = require('../config/database');
const { isAllowedMime, safeExtFromOriginal } = require('../config/uploads');

const TASK_ATTACHMENT_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/zip',
  'application/x-zip-compressed',
]);

const TASK_ATTACHMENT_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.docx', '.doc', '.xlsx', '.xls', '.zip']);

function validateAttachment(mimeType, originalName) {
  const ext = safeExtFromOriginal(originalName);
  const mimeOk = mimeType && TASK_ATTACHMENT_MIME.has(String(mimeType).toLowerCase());
  const extOk = TASK_ATTACHMENT_EXT.has(ext);
  if (!mimeOk && !extOk) {
    return { valid: false, error: 'Invalid file type. Allowed: images, PDF, Word, Excel, ZIP.' };
  }
  return { valid: true };
}

async function create(data) {
  const { task_progress_id, task_id, file_name, original_name, mime_type, size_bytes, file_data, uploaded_by } = data;

  const [result] = await db.query(
    `INSERT INTO task_attachments (task_progress_id, task_id, file_name, original_name, mime_type, size_bytes, file_data, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      task_progress_id || null,
      task_id,
      file_name,
      original_name,
      mime_type || null,
      size_bytes || null,
      file_data || null,
      uploaded_by,
    ]
  );
  return result.insertId;
}

async function findById(id) {
  const [rows] = await db.query(
    'SELECT * FROM task_attachments WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function findByProgressId(progressId) {
  const [rows] = await db.query(
    'SELECT * FROM task_attachments WHERE task_progress_id = ? ORDER BY created_at DESC',
    [progressId]
  );
  return rows;
}

async function findByTaskId(taskId) {
  const [rows] = await db.query(
    'SELECT * FROM task_attachments WHERE task_id = ? ORDER BY created_at DESC',
    [taskId]
  );
  return rows;
}

async function remove(id) {
  const [result] = await db.query('DELETE FROM task_attachments WHERE id = ?', [id]);
  return result.affectedRows;
}

module.exports = {
  TASK_ATTACHMENT_MIME,
  TASK_ATTACHMENT_EXT,
  validateAttachment,
  create,
  findById,
  findByProgressId,
  findByTaskId,
  remove,
};

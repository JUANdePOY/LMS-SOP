const db = require('../config/database');

async function getAttachmentColumns() {
  const [rows] = await db.query(
    'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    ['sop_module_attachments']
  );
  const cols = new Set(rows.map(r => r.COLUMN_NAME));
  return {
    softDelete: cols.has('is_deleted') ? 'is_deleted' : 'deleted_at',
    hasOriginalName: cols.has('original_name'),
    hasUpdatedAt: cols.has('updated_at'),
  };
}

let attachmentColumns = null;
async function getCachedAttachmentColumns() {
  if (!attachmentColumns) {
    attachmentColumns = await getAttachmentColumns();
  }
  return attachmentColumns;
}

function notDeletedClause(cols, alias = 'a') {
  return cols.softDelete === 'is_deleted'
    ? `(${alias}.is_deleted = 0 OR ${alias}.is_deleted IS NULL)`
    : `${alias}.deleted_at IS NULL`;
}

async function listByModule(moduleId) {
  const cols = await getCachedAttachmentColumns();
  const [rows] = await db.query(
    `SELECT * FROM sop_module_attachments a WHERE a.module_id = ? AND ${notDeletedClause(cols)} ORDER BY a.created_at DESC`,
    [moduleId]
  );
  return rows;
}

async function getById(attachmentId) {
  const cols = await getCachedAttachmentColumns();
  const [rows] = await db.query(
    `SELECT * FROM sop_module_attachments a WHERE a.id = ? AND ${notDeletedClause(cols)}`,
    [attachmentId]
  );
  return rows[0] || null;
}

async function createAttachment(data) {
  const { module_id, file_name, original_name, mime_type, file_size, file_extension, file_data, uploaded_by } = data;
  const cols = await getCachedAttachmentColumns();

  const insertCols = ['module_id', 'file_name'];
  const insertVals = [module_id, file_name];

  if (cols.hasOriginalName) {
    insertCols.push('original_name');
    insertVals.push(original_name || null);
  }

  if (mime_type !== undefined && mime_type !== null) {
    insertCols.push('mime_type');
    insertVals.push(mime_type);
  }

  if (file_extension !== undefined && file_extension !== null) {
    insertCols.push('file_extension');
    insertVals.push(file_extension);
  }

  if (file_size !== undefined && file_size !== null) {
    insertCols.push('file_size');
    insertVals.push(file_size);
  }

  if (file_data !== undefined) {
    insertCols.push('file_data');
    insertVals.push(file_data);
  }

  insertCols.push('uploaded_by');
  insertVals.push(uploaded_by || null);

  insertCols.push('download_count');
  insertVals.push(0);

  if (cols.softDelete === 'is_deleted') {
    insertCols.push('is_deleted');
    insertVals.push(false);
  }

  const [result] = await db.query(
    `INSERT INTO sop_module_attachments (${insertCols.join(', ')}) VALUES (${insertCols.map(() => '?').join(', ')})`,
    insertVals
  );
  return result.insertId;
}

async function softDeleteAttachment(attachmentId) {
  const cols = await getCachedAttachmentColumns();
  if (cols.softDelete === 'is_deleted') {
    const [result] = await db.query(
      'UPDATE sop_module_attachments SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = FALSE',
      [attachmentId]
    );
    return result.affectedRows;
  }
  const [result] = await db.query(
    'UPDATE sop_module_attachments SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [attachmentId]
  );
  return result.affectedRows;
}

async function restoreAttachment(attachmentId) {
  const cols = await getCachedAttachmentColumns();
  if (cols.softDelete === 'is_deleted') {
    const [result] = await db.query(
      'UPDATE sop_module_attachments SET is_deleted = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = TRUE',
      [attachmentId]
    );
    return result.affectedRows;
  }
  const [result] = await db.query(
    'UPDATE sop_module_attachments SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NOT NULL',
    [attachmentId]
  );
  return result.affectedRows;
}

async function permanentDeleteAttachment(attachmentId) {
  const [result] = await db.query('DELETE FROM sop_module_attachments WHERE id = ?', [attachmentId]);
  return result.affectedRows;
}

async function listTrashedAttachments(moduleId) {
  const cols = await getCachedAttachmentColumns();
  const deletedClause = cols.softDelete === 'is_deleted' ? 'a.is_deleted = TRUE' : 'a.deleted_at IS NOT NULL';
  const [rows] = await db.query(
    `SELECT * FROM sop_module_attachments a WHERE a.module_id = ? AND ${deletedClause} ORDER BY a.created_at DESC`,
    [moduleId]
  );
  return rows;
}

async function incrementDownloadCount(attachmentId) {
  const cols = await getCachedAttachmentColumns();
  const whereClause = cols.softDelete === 'is_deleted'
    ? 'WHERE id = ? AND is_deleted = FALSE'
    : 'WHERE id = ?';
  const [result] = await db.query(
    `UPDATE sop_module_attachments SET download_count = download_count + 1 ${whereClause}`,
    [attachmentId]
  );
  return result.affectedRows;
}

module.exports = {
  listByModule,
  getById,
  createAttachment,
  softDeleteAttachment,
  restoreAttachment,
  permanentDeleteAttachment,
  listTrashedAttachments,
  incrementDownloadCount,
};

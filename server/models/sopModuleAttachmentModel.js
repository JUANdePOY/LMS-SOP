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
    hasVersionId: cols.has('sop_version_id'),
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

/**
 * Build version filter clause for attachments. Returns [params, clause].
 * - If versionId is provided and column exists: filter by exact version
 * - If column exists but no versionId: show null-version (legacy) + current version
 */
function buildVersionFilter(cols, versionId = null) {
  if (!cols.hasVersionId) return [[], ''];
  if (versionId !== null && versionId !== undefined) {
    return [[versionId], 'AND a.sop_version_id = ?'];
  }
  // Default: show legacy attachments (no version) plus all versions for backward compat
  return [[], ''];
}

async function listByModule(moduleId, versionId = null) {
  const cols = await getCachedAttachmentColumns();
  const [params, versionClause] = buildVersionFilter(cols, versionId);
  const [rows] = await db.query(
    `SELECT * FROM sop_module_attachments a WHERE a.module_id = ? AND ${notDeletedClause(cols)} ${versionClause} ORDER BY a.created_at DESC`,
    [moduleId, ...params]
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

async function getByIdIncludingDeleted(attachmentId) {
  const cols = await getCachedAttachmentColumns();
  const [rows] = await db.query(
    `SELECT * FROM sop_module_attachments a WHERE a.id = ?`,
    [attachmentId]
  );
  return rows[0] || null;
}

async function createAttachment(data) {
  const {
    module_id,
    file_name,
    original_name,
    mime_type,
    file_size,
    file_extension,
    file_data,
    uploaded_by,
    link_url,
    sop_version_id,
  } = data;
  const cols = await getCachedAttachmentColumns();

  const insertCols = ['module_id'];
  const insertVals = [module_id];

  // Handle link_url: store link marker in file_name, actual URL in link_url
  if (link_url) {
    insertCols.push('file_name');
    insertVals.push(`link:${link_url}`);
    
    // Always add link_url column since we added the migration
    insertCols.push('link_url');
    insertVals.push(link_url);
    
    if (cols.hasOriginalName) {
      insertCols.push('original_name');
      insertVals.push(original_name || 'Link');
    }
  } else {
    // Regular file attachment
    if (file_name) {
      insertCols.push('file_name');
      insertVals.push(file_name);
    }
    if (cols.hasOriginalName) {
      insertCols.push('original_name');
      insertVals.push(original_name || null);
    }
  }

  if (sop_version_id !== undefined && cols.hasVersionId) {
    insertCols.push('sop_version_id');
    insertVals.push(sop_version_id || null);
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

async function listTrashedAttachments(moduleId, versionId = null) {
  const cols = await getCachedAttachmentColumns();
  const deletedClause = cols.softDelete === 'is_deleted' ? 'a.is_deleted = TRUE' : 'a.deleted_at IS NOT NULL';
  const [params, versionClause] = buildVersionFilter(cols, versionId);
  const [rows] = await db.query(
    `SELECT * FROM sop_module_attachments a WHERE a.module_id = ? AND ${deletedClause} ${versionClause} ORDER BY a.created_at DESC`,
    [moduleId, ...params]
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
  getByIdIncludingDeleted,
  createAttachment,
  softDeleteAttachment,
  restoreAttachment,
  permanentDeleteAttachment,
  listTrashedAttachments,
  incrementDownloadCount,
};

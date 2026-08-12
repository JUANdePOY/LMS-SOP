const sopVersionModel = require('../models/sopVersionModel');
const sopModel = require('../models/sopModel');
const sopModuleModel = require('../models/sopModuleModel');
const sopChangeLogModel = require('../models/sopChangeLogModel');
const db = require('../config/database');
const { logAudit } = require('../utils/auditLogger');
const sopAuditLogService = require('./sopAuditLogService');
const sopService = require('./sopService');

/**
 * Determine the soft-delete clause for the sop_modules table.
 * Detects whether the table uses is_deleted (boolean) or deleted_at (datetime).
 */
async function getModulesNotDeletedClause() {
  const [rows] = await db.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sop_modules'
  `);
  const cols = new Set(rows.map(r => r.COLUMN_NAME));
  const hasVersionId = cols.has('sop_version_id');
  const softDelete = cols.has('is_deleted') ? 'is_deleted' : 'deleted_at';
  const clause = softDelete === 'is_deleted'
    ? `(m.is_deleted = 0 OR m.is_deleted IS NULL)`
    : `m.deleted_at IS NULL`;
  return { clause, hasVersionId };
}

/**
 * Check if a table has a specific column.
 */
async function tableHasColumn(tableName, columnName) {
  const [rows] = await db.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
  `, [tableName, columnName]);
  return rows.length > 0;
}

/**
 * Get column info for sop_module_attachments table.
 */
async function getAttachmentColumns() {
  const hasVersionId = await tableHasColumn('sop_module_attachments', 'sop_version_id');
  const hasOriginalName = await tableHasColumn('sop_module_attachments', 'original_name');
  const softDelete = await tableHasColumn('sop_module_attachments', 'is_deleted') ? 'is_deleted' : 'deleted_at';
  return { hasVersionId, hasOriginalName, softDelete };
}

async function listVersions(sopId) {
  return sopVersionModel.getVersions(sopId);
}

async function getVersionById(versionId) {
  const version = await sopVersionModel.getVersionById(versionId);
  if (!version) {
    const error = new Error('Version not found');
    error.code = 'NOT_FOUND';
    throw error;
  }
  return version;
}

/**
 * Creates a new version of an SOP. If `copyContentFromCurrent` is true (default),
 * duplicates all modules and their attachments from the current version into the
 * new version, establishing proper version isolation.
 */
async function createVersion(sopId, data, actorId) {
  const sop = await sopModel.findById(sopId);
  if (!sop) {
    const error = new Error('SOP not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const actor = await db.query(
    'SELECT id, role, business_id, department_id FROM users WHERE id = ?',
    [actorId]
  ).then(([rows]) => rows[0] || null);
  if (actor) {
    await sopService.enforceSopWriteScope(sop, actor);
  }

  const copyContent = data.copy_content !== false; // default to true
  const currentVersion = await sopVersionModel.getCurrentVersion(sopId);
  const sourceVersionId = currentVersion ? currentVersion.id : null;

  // Create the new version
  const versionId = await sopVersionModel.createVersion({
    sop_id: sopId,
    version: data.version || '1.0',
    change_summary: data.change_summary || null,
    status: data.status || 'Draft',
    created_by: actorId,
  }, { makeCurrent: true });

  // If copying content and we have a source version, duplicate modules + attachments
  if (copyContent && sourceVersionId) {
    const { clause: notDeletedClause, hasVersionId } = await getModulesNotDeletedClause();

    // Get all non-deleted modules for the source version (or legacy modules with NULL version)
    let moduleQuery = `
      SELECT * FROM sop_modules m
      WHERE m.sop_id = ? AND ${notDeletedClause}
    `;
    const moduleParams = [sopId];

    if (hasVersionId) {
      moduleQuery += ` AND (m.sop_version_id = ? OR m.sop_version_id IS NULL)`;
      moduleParams.push(sourceVersionId);
    }

    const [modules] = await db.query(moduleQuery, moduleParams);

    // Check if attachments table has sop_version_id
    const attachmentCols = await getAttachmentColumns();
    const hasAttachmentVersion = attachmentCols.hasVersionId;

    // Duplicate each module into the new version
    for (const module of modules) {
      const newModuleId = await sopModuleModel.createModule({
        sop_id: module.sop_id,
        title: module.title,
        content: module.content,
        sort_order: module.sort_order,
        created_by: actorId,
        sop_version_id: versionId,
      });

      // Copy attachments, including sop_version_id if the column exists
      if (hasAttachmentVersion) {
        await db.query(`
          INSERT INTO sop_module_attachments (
            module_id, file_name, original_name, mime_type, file_size, file_extension,
            file_data, uploaded_by, download_count, sop_version_id
          )
          SELECT ?, file_name, original_name, mime_type, file_size, file_extension,
            file_data, uploaded_by, download_count, ?
          FROM sop_module_attachments a
          WHERE a.module_id = ? AND (a.is_deleted = 0 OR a.is_deleted IS NULL)
        `, [newModuleId, versionId, module.id]);
      } else {
        await db.query(`
          INSERT INTO sop_module_attachments (
            module_id, file_name, original_name, mime_type, file_size, file_extension,
            file_data, uploaded_by, download_count
          )
          SELECT ?, file_name, original_name, mime_type, file_size, file_extension,
            file_data, uploaded_by, download_count
          FROM sop_module_attachments a
          WHERE a.module_id = ? AND (a.is_deleted = 0 OR a.is_deleted IS NULL)
        `, [newModuleId, module.id]);
      }
    }
  }

  logAudit({
    user_id: actorId,
    action: 'sop.version.created',
    entity_type: 'sop_version',
    entity_id: versionId,
    metadata: { sop_id: sopId, copy_content: copyContent, source_version_id: sourceVersionId },
  });

  sopAuditLogService.logEntry({
    entity_type: 'sop_version',
    entity_id: versionId,
    action: 'sop.version.created',
    performed_by: actorId,
    new_values: { 
      version: data.version || '1.0', 
      status: data.status || 'Draft',
      copy_content: copyContent 
    },
  });

  return { id: versionId };
}

async function restoreVersion(sopId, versionId, actorId) {
  const result = await sopVersionModel.restoreVersion(sopId, versionId);
  if (!result) {
    const error = new Error('Version not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const sop = await sopModel.findById(sopId);
  if (sop) {
    const actor = await db.query(
      'SELECT id, role, business_id, department_id FROM users WHERE id = ?',
      [actorId]
    ).then(([rows]) => rows[0] || null);
    if (actor) {
      await sopService.enforceSopWriteScope(sop, actor);
    }
  }

  logAudit({
    user_id: actorId,
    action: 'sop.version.restored',
    entity_type: 'sop_version',
    entity_id: versionId,
    metadata: { sop_id: sopId },
  });

  sopAuditLogService.logEntry({
    entity_type: 'sop_version',
    entity_id: versionId,
    action: 'sop.version.restored',
    performed_by: actorId,
  });

  return result;
}

module.exports = {
  listVersions,
  getVersionById,
  createVersion,
  restoreVersion,
};
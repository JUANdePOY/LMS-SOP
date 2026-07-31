const sopVersionModel = require('../models/sopVersionModel');
const sopModel = require('../models/sopModel');
const sopChangeLogModel = require('../models/sopChangeLogModel');
const { logAudit } = require('../utils/auditLogger');
const sopAuditLogService = require('./sopAuditLogService');

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

async function createVersion(sopId, data, actorId) {
  const sop = await sopModel.findById(sopId);
  if (!sop) {
    const error = new Error('SOP not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const versionId = await sopVersionModel.createVersion({
    sop_id: sopId,
    version: data.version || '1.0',
    change_summary: data.change_summary || null,
    status: data.status || 'Draft',
    created_by: actorId,
  }, { makeCurrent: true });

  logAudit({
    user_id: actorId,
    action: 'sop.version.created',
    entity_type: 'sop_version',
    entity_id: versionId,
    metadata: { sop_id: sopId },
  });

  sopAuditLogService.logEntry({
    entity_type: 'sop_version',
    entity_id: versionId,
    action: 'sop.version.created',
    performed_by: actorId,
    new_values: { version: data.version || '1.0', status: data.status || 'Draft' },
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
const sopModel = require('../models/sopModel');
const sopVersionModel = require('../models/sopVersionModel');
const sopAssignmentService = require('./sopAssignmentService');
const sopAcknowledgementService = require('./sopAcknowledgementService');
const sopShareService = require('./sopShareService');
const { generateSopCode } = require('../utils/sopUtils');
const { logAudit } = require('../utils/auditLogger');
const sopAuditLogService = require('./sopAuditLogService');

async function listSops(filters = {}) {
  return sopModel.findAll(filters);
}

async function getSopById(id, user) {
  const sop = await sopModel.findById(id);
  if (!sop) {
    const error = new Error('SOP not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (user) {
    const cols = await sopModel.getSopsColumns();
    const restriction = sopModel.restrictionWhere(user, cols, 'sops');
    if (restriction && !sopModel.canAccessSop(sop, user)) {
      const error = new Error('You do not have permission to access this SOP');
      error.code = 'FORBIDDEN';
      throw error;
    }
  }

  return sop;
}

async function createSop(data, actorId) {
  const { title, description, department_id, category_id, status } = data;
  const code = data.code || generateSopCode(title);

  const existing = await sopModel.findByCode(code);
  if (existing) {
    const error = new Error('SOP code already exists');
    error.code = 'CODE_EXISTS';
    throw error;
  }

  const id = await sopModel.create({
    title,
    code,
    description,
    department_id,
    category_id,
    owner_user_id: actorId,
    status: status || 'Draft',
    version: '1.0',
  });

  await sopVersionModel.createVersion({
    sop_id: id,
    version: '1.0',
    status: status || 'Draft',
    created_by: actorId,
  }, { makeCurrent: true });

  logAudit({
    user_id: actorId,
    action: 'sop.created',
    entity_type: 'sop',
    entity_id: id,
    metadata: { title, code, status: status || 'Draft' },
  });

  sopAuditLogService.logEntry({
    entity_type: 'sop',
    entity_id: id,
    action: 'sop.created',
    performed_by: actorId,
    new_values: { title, code, status: status || 'Draft', department_id, category_id },
  });

  return { id, title, code, status: status || 'Draft' };
}

async function updateSop(id, data, actorId) {
  const existing = await sopModel.findById(id);
  if (!existing) {
    const error = new Error('SOP not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const updates = {};
  ['title', 'description', 'department_id', 'category_id', 'status'].forEach((field) => {
    if (data[field] !== undefined) updates[field] = data[field];
  });

  if (Object.keys(updates).length === 0) {
    const error = new Error('No changes provided');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  await sopModel.update(id, updates);

  logAudit({
    user_id: actorId,
    action: 'sop.updated',
    entity_type: 'sop',
    entity_id: id,
    metadata: updates,
  });

  sopAuditLogService.logEntry({
    entity_type: 'sop',
    entity_id: id,
    action: 'sop.updated',
    performed_by: actorId,
    old_values: { title: existing.title, description: existing.description, status: existing.status },
    new_values: updates,
  });

  return { affectedRows: 1 };
}

async function deleteSop(id, actorId) {
  const existing = await sopModel.findById(id);
  if (!existing) {
    const error = new Error('SOP not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  await sopModel.softDelete(id);

  logAudit({
    user_id: actorId,
    action: 'sop.deleted',
    entity_type: 'sop',
    entity_id: id,
    metadata: { title: existing.title },
  });

  sopAuditLogService.logEntry({
    entity_type: 'sop',
    entity_id: id,
    action: 'sop.deleted',
    performed_by: actorId,
    old_values: { is_deleted: false },
    new_values: { is_deleted: true },
  });

  return { affectedRows: 1 };
}

async function restoreSop(id, actorId) {
  const existing = await sopModel.findByIdIncludingDeleted(id);
  if (!existing) {
    const error = new Error('SOP not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  await sopModel.restore(id);

  logAudit({
    user_id: actorId,
    action: 'sop.restored',
    entity_type: 'sop',
    entity_id: id,
    metadata: { title: existing.title },
  });

  sopAuditLogService.logEntry({
    entity_type: 'sop',
    entity_id: id,
    action: 'sop.restored',
    performed_by: actorId,
    old_values: { is_deleted: true },
    new_values: { is_deleted: false },
  });

  return { affectedRows: 1 };
}

async function permanentDeleteSop(id, actorId) {
  const existing = await sopModel.findByIdIncludingDeleted(id);
  if (!existing) {
    const error = new Error('SOP not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  await sopModel.permanentDelete(id);

  logAudit({
    user_id: actorId,
    action: 'sop.permanently_deleted',
    entity_type: 'sop',
    entity_id: id,
    metadata: { title: existing.title },
  });

  sopAuditLogService.logEntry({
    entity_type: 'sop',
    entity_id: id,
    action: 'sop.permanently_deleted',
    performed_by: actorId,
    new_values: { permanently_deleted: true },
  });

  return { affectedRows: 1 };
}

async function listTrashedSops(filters = {}) {
  return sopModel.listTrashed(filters);
}

async function emptyTrash(actorId) {
  const trashed = await sopModel.listTrashed({ limit: 1000 });
  const ids = trashed.rows.map((row) => row.id);

  for (const row of trashed.rows) {
    await sopModel.permanentDelete(row.id);
    logAudit({
      user_id: actorId,
      action: 'sop.permanently_deleted',
      entity_type: 'sop',
      entity_id: row.id,
      metadata: { title: row.title, trashed: true },
    });

    sopAuditLogService.logEntry({
      entity_type: 'sop',
      entity_id: row.id,
      action: 'sop.permanently_deleted',
      performed_by: actorId,
      metadata: { trashed: true },
      new_values: { permanently_deleted: true },
    });
  }

  return { deletedCount: ids.length };
}

async function getSopStats() {
  const db = require('../config/database');
  const [rows] = await db.query(`
    SELECT status, COUNT(*) AS count
    FROM sops
    WHERE (is_deleted = 0 OR is_deleted IS NULL)
    GROUP BY status
  `);
  return rows;
}

module.exports = {
  listSops,
  getSopById,
  createSop,
  updateSop,
  deleteSop,
  restoreSop,
  permanentDeleteSop,
  listTrashedSops,
  emptyTrash,
  getSopStats,
};
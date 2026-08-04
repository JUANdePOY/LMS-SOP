const sopModuleModel = require('../models/sopModuleModel');
const sopVersionModel = require('../models/sopVersionModel');
const { logAudit } = require('../utils/auditLogger');
const sopAuditLogService = require('./sopAuditLogService');

async function listModules(sopId, versionId = null) {
  return sopModuleModel.listModules(sopId, versionId);
}

async function getModuleById(moduleId) {
  const module = await sopModuleModel.getModuleById(moduleId);
  if (!module) {
    const error = new Error('Module not found');
    error.code = 'NOT_FOUND';
    throw error;
  }
  return module;
}

async function createModule(sopId, data, actorId) {
  // Resolve the current version for this SOP
  const versionId = data.sop_version_id || await sopVersionModel.getCurrentVersionId(sopId);

  const id = await sopModuleModel.createModule({
    sop_id: sopId,
    title: data.title,
    content: data.content || null,
    sort_order: data.sort_order || 1,
    created_by: actorId,
    sop_version_id: versionId,
  });

  logAudit({
    user_id: actorId,
    action: 'sop.module.created',
    entity_type: 'sop_module',
    entity_id: id,
    metadata: { sop_id: sopId, sop_version_id: versionId },
  });

  sopAuditLogService.logEntry({
    entity_type: 'sop',
    entity_id: sopId,
    action: 'sop.module.created',
    performed_by: actorId,
    new_values: { module_id: id, title: data.title, sop_version_id: versionId },
  });

  return { id, title: data.title, content: data.content || null, sort_order: data.sort_order || 1, sop_version_id: versionId };
}

async function updateModule(moduleId, data, actorId) {
  const existing = await sopModuleModel.getModuleById(moduleId);
  if (!existing) {
    const error = new Error('Module not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  await sopModuleModel.updateModule(moduleId, {
    ...data,
    updated_by: actorId,
  });

  logAudit({
    user_id: actorId,
    action: 'sop.module.updated',
    entity_type: 'sop_module',
    entity_id: moduleId,
    metadata: { sop_id: existing.sop_id },
  });

  sopAuditLogService.logEntry({
    entity_type: 'sop',
    entity_id: existing.sop_id,
    action: 'sop.module.updated',
    performed_by: actorId,
    old_values: { title: existing.title, content: existing.content },
    new_values: { module_id: moduleId, ...data },
  });

  return { affectedRows: 1 };
}

async function deleteModule(moduleId, actorId) {
  const existing = await sopModuleModel.getModuleById(moduleId);
  if (!existing) {
    const error = new Error('Module not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  await sopModuleModel.deleteModule(moduleId);

  logAudit({
    user_id: actorId,
    action: 'sop.module.deleted',
    entity_type: 'sop_module',
    entity_id: moduleId,
    metadata: { sop_id: existing.sop_id },
  });

  sopAuditLogService.logEntry({
    entity_type: 'sop',
    entity_id: existing.sop_id,
    action: 'sop.module.deleted',
    performed_by: actorId,
    old_values: { module_id: moduleId, title: existing.title },
    new_values: { is_deleted: true },
  });

  return { affectedRows: 1 };
}

async function restoreModule(moduleId, actorId) {
  const existing = await sopModuleModel.getModuleByIdIncludingDeleted(moduleId);
  if (!existing) {
    const error = new Error('Module not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  await sopModuleModel.restoreModule(moduleId);

  logAudit({
    user_id: actorId,
    action: 'sop.module.restored',
    entity_type: 'sop_module',
    entity_id: moduleId,
    metadata: { sop_id: existing.sop_id },
  });

  sopAuditLogService.logEntry({
    entity_type: 'sop',
    entity_id: existing.sop_id,
    action: 'sop.module.restored',
    performed_by: actorId,
    old_values: { is_deleted: true },
    new_values: { is_deleted: false },
  });

  return { affectedRows: 1 };
}

async function permanentDeleteModule(moduleId, actorId) {
  const existing = await sopModuleModel.getModuleByIdIncludingDeleted(moduleId);
  if (!existing) {
    const error = new Error('Module not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  await sopModuleModel.permanentDeleteModule(moduleId);

  logAudit({
    user_id: actorId,
    action: 'sop.module.permanently_deleted',
    entity_type: 'sop_module',
    entity_id: moduleId,
    metadata: { sop_id: existing.sop_id },
  });

  sopAuditLogService.logEntry({
    entity_type: 'sop',
    entity_id: existing.sop_id,
    action: 'sop.module.permanently_deleted',
    performed_by: actorId,
    new_values: { permanently_deleted: true },
  });

  return { affectedRows: 1 };
}

async function listTrashedModules(sopId) {
  return sopModuleModel.listTrashedModules(sopId);
}

async function updateSortOrder(sopId, moduleOrders, actorId) {
  await sopModuleModel.updateSortOrder(sopId, moduleOrders);

  logAudit({
    user_id: actorId,
    action: 'sop.module.sort_updated',
    entity_type: 'sop_module',
    entity_id: sopId,
    metadata: { sop_id: sopId, orders: moduleOrders },
  });

  sopAuditLogService.logEntry({
    entity_type: 'sop',
    entity_id: sopId,
    action: 'sop.module.sort_updated',
    performed_by: actorId,
    new_values: { orders: moduleOrders },
  });

  return true;
}

module.exports = {
  listModules,
  getModuleById,
  createModule,
  updateModule,
  deleteModule,
  restoreModule,
  permanentDeleteModule,
  listTrashedModules,
  updateSortOrder,
};
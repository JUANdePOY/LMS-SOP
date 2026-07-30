const sopModuleModel = require('../models/sopModuleModel');
const { logAudit } = require('../utils/auditLogger');

async function listModules(sopId) {
  return sopModuleModel.listModules(sopId);
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
  const id = await sopModuleModel.createModule({
    sop_id: sopId,
    title: data.title,
    content: data.content || null,
    sort_order: data.sort_order || 1,
    created_by: actorId,
  });

  logAudit({
    user_id: actorId,
    action: 'sop.module.created',
    entity_type: 'sop_module',
    entity_id: id,
    metadata: { sop_id: sopId },
  });

  return { id, title: data.title, content: data.content || null, sort_order: data.sort_order || 1 };
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

  return { affectedRows: 1 };
}

async function restoreModule(moduleId, actorId) {
  const existing = await sopModuleModel.getModuleById(moduleId);
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

  return { affectedRows: 1 };
}

async function permanentDeleteModule(moduleId, actorId) {
  const existing = await sopModuleModel.getModuleById(moduleId);
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
const sopModel = require('../models/sopModel');
const sopVersionModel = require('../models/sopVersionModel');
const sopAssignmentService = require('./sopAssignmentService');
const sopAcknowledgementService = require('./sopAcknowledgementService');
const sopShareService = require('./sopShareService');
const { generateSopCode } = require('../utils/sopUtils');
const { logAudit } = require('../utils/auditLogger');
const sopAuditLogService = require('./sopAuditLogService');
const db = require('../config/database');
const { broadcastSystemChange } = require('./notificationService');

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

  await enforceSopScope(sop, user);

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

async function enforceSopScope(sop, user) {
  if (!sop || !user) return;
  const role = user.role || '';
  if (role === 'super_admin') return;

  const cols = await sopModel.getSopsColumns();
  if (!cols.hasDepartment || !sop.department_id) return;

  if (role === 'admin') {
    if (!user.business_id) {
      const error = new Error('Your account has no business scope');
      error.code = 'FORBIDDEN';
      throw error;
    }
    const [[dept]] = await db.query(
      'SELECT business_id FROM departments WHERE id = ?',
      [sop.department_id]
    );
    if (!dept || dept.business_id !== user.business_id) {
      const error = new Error('Access denied: SOP is outside your business scope');
      error.code = 'FORBIDDEN';
      throw error;
    }
    return;
  }

  if (role === 'department_head') {
    const scopedDeptIds = user.scoped_department_ids || (user.department_id ? [user.department_id] : []);
    if (!scopedDeptIds.includes(sop.department_id)) {
      const error = new Error('Access denied: SOP is outside your department scope');
      error.code = 'FORBIDDEN';
      throw error;
    }
    return;
  }
}

async function enforceSopWriteScope(sopOrDeptId, user) {
  if (!user) return;
  const role = user.role || '';
  if (role === 'super_admin') return;

  const deptId = typeof sopOrDeptId === 'object' ? sopOrDeptId.department_id : sopOrDeptId;
  if (!deptId) return;

  const cols = await sopModel.getSopsColumns();
  if (!cols.hasDepartment) return;

  if (role === 'admin') {
    if (!user.business_id) {
      const error = new Error('Your account has no business scope');
      error.code = 'FORBIDDEN';
      throw error;
    }
    const [[dept]] = await db.query(
      'SELECT business_id FROM departments WHERE id = ?',
      [deptId]
    );
    if (!dept || dept.business_id !== user.business_id) {
      const error = new Error('Cannot modify SOPs outside your business scope');
      error.code = 'FORBIDDEN';
      throw error;
    }
    return;
  }

  if (role === 'department_head') {
    const scopedDeptIds = user.scoped_department_ids || (user.department_id ? [user.department_id] : []);
    if (!scopedDeptIds.includes(deptId)) {
      const error = new Error('Cannot modify SOPs outside your department scope');
      error.code = 'FORBIDDEN';
      throw error;
    }
    return;
  }
}

async function createSop(data, actorId) {
  const { title, description, department_id, category_id, status, restriction_type, is_default_onboarding } = data;
  const code = data.code || generateSopCode(title);

  const existing = await sopModel.findByCode(code);
  if (existing) {
    const error = new Error('SOP code already exists');
    error.code = 'CODE_EXISTS';
    throw error;
  }

  const actor = await getUser(actorId);
  if (actor) {
    await enforceSopWriteScope({ department_id: department_id || null }, actor);
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
    restriction_type,
    is_default_onboarding: is_default_onboarding ? 1 : 0,
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

  const sopStatus = status || 'Draft';
  if (sopStatus !== 'Draft') {
    broadcastSystemChange({
      title: 'New SOP Available',
      body: title,
      type: 'info',
      link: `/sops/${id}`,
      entityType: 'sop',
      entityId: id,
    }).catch(() => {});
  }

  return { id, title, code, status: sopStatus };
}

async function getUser(userId) {
  const [rows] = await db.query(
    'SELECT id, role, business_id, department_id FROM users WHERE id = ?',
    [userId]
  );
  return rows[0] || null;
}

async function updateSop(id, data, actorId) {
  const existing = await sopModel.findById(id);
  if (!existing) {
    const error = new Error('SOP not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const actor = await getUser(actorId);
  if (actor) {
    await enforceSopScope(existing, actor);
    if (data.department_id !== undefined) {
      await enforceSopWriteScope({ department_id: data.department_id }, actor);
    } else {
      await enforceSopWriteScope(existing, actor);
    }
  }

  const updates = {};
    ['title', 'description', 'department_id', 'category_id', 'status', 'restriction_type', 'is_default_onboarding'].forEach((field) => {
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

  const actor = await getUser(actorId);
  if (actor) {
    await enforceSopScope(existing, actor);
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

  const actor = await getUser(actorId);
  if (actor) {
    await enforceSopScope(existing, actor);
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

  const actor = await getUser(actorId);
  if (actor) {
    await enforceSopScope(existing, actor);
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
  const actor = await getUser(actorId);
  const ids = [];

  for (const row of trashed.rows) {
    if (actor) {
      await enforceSopScope(row, actor);
    }
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
    ids.push(row.id);
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
const complianceModel = require('../models/sopComplianceModel');
const sopModel = require('../models/sopModel');
const assignmentService = require('./sopAssignmentService');
const sopService = require('./sopService');
const db = require('../config/database');

async function enforceSopReadScope(sop, actorId) {
  if (!sop) return;
  const actor = await db.query(
    'SELECT id, role, business_id, department_id FROM users WHERE id = ?',
    [actorId]
  ).then(([rows]) => rows[0] || null);
  if (!actor) return;
  const role = actor.role || '';
  if (role === 'super_admin') return;
  if (sop.business_id && sop.business_id !== actor.business_id) {
    const error = new Error('Access denied: SOP is outside your business scope');
    error.code = 'FORBIDDEN';
    throw error;
  }
}

async function enforceAcknowledgementWriteScope(sop, actorId) {
  const actor = await db.query(
    'SELECT id, role, business_id, department_id FROM users WHERE id = ?',
    [actorId]
  ).then(([rows]) => rows[0] || null);
  if (!actor) return;
  const role = actor.role || '';
  if (role === 'super_admin') return;
  if (sop.business_id && sop.business_id !== actor.business_id) {
    const error = new Error('Access denied: SOP is outside your business scope');
    error.code = 'FORBIDDEN';
    throw error;
  }
}

async function listAcknowledgements(sopId, filters = {}) {
  const sop = await sopModel.findById(sopId);
  if (!sop) {
    const error = new Error('SOP not found');
    error.code = 'NOT_FOUND';
    throw error;
  }
  return complianceModel.listAcknowledgements(sopId, filters);
}

async function listPendingAcknowledgements(sopId) {
  return listAcknowledgements(sopId, { status: 'Pending' });
}

async function listUserAcknowledgements(userId, filters = {}) {
  return complianceModel.listAcknowledgementsByUser(userId, filters);
}

async function getAcknowledgementStats(sopId) {
  const sop = await sopModel.findById(sopId);
  if (!sop) {
    const error = new Error('SOP not found');
    error.code = 'NOT_FOUND';
    throw error;
  }
  return complianceModel.getAcknowledgementStats(sopId);
}

async function createAcknowledgement(sopId, userId, status = 'Pending') {
  const sop = await sopModel.findById(sopId);
  if (!sop) {
    const error = new Error('SOP not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const actor = await db.query(
    'SELECT id, role, business_id, department_id FROM users WHERE id = ?',
    [userId]
  ).then(([rows]) => rows[0] || null);
  if (actor) {
    await enforceAcknowledgementWriteScope(sop, actor.id);
  }

  const existing = await complianceModel.findAcknowledgementBySopAndUser(sopId, userId);
  if (existing) {
    const error = new Error('Acknowledgement already exists for this user');
    error.code = 'DUPLICATE_ACKNOWLEDGEMENT';
    throw error;
  }

  const id = await complianceModel.createAcknowledgement({ sop_id: sopId, user_id: userId, status });
  const rows = await complianceModel.listAcknowledgements(sopId);
  return rows.find((row) => row.id === id) || { id, sop_id: sopId, user_id: userId, status };
}

async function acknowledgeSop(sopId, userId) {
  const sop = await sopModel.findById(sopId);
  if (!sop) {
    const error = new Error('SOP not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const actor = await db.query(
    'SELECT id, role, business_id, department_id FROM users WHERE id = ?',
    [userId]
  ).then(([rows]) => rows[0] || null);
  if (actor) {
    await enforceAcknowledgementWriteScope(sop, actor.id);
  }

  const existing = await complianceModel.findAcknowledgementBySopAndUser(sopId, userId);
  if (!existing) {
    const error = new Error('No acknowledgement record found for this SOP');
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (existing.status === 'Acknowledged') {
    return existing;
  }

  await complianceModel.acknowledge(sopId, userId);
  return complianceModel.findAcknowledgementBySopAndUser(sopId, userId);
}

async function generateAcknowledgementsOnPublish(sopId) {
  const sop = await sopModel.findById(sopId);
  if (!sop) {
    const error = new Error('SOP not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const userIds = await assignmentService.resolveAssignedUserIds(sopId);
  const results = { created: 0, reset: 0, skipped: 0, userIds };

  for (const userId of userIds) {
    const existing = await complianceModel.findAcknowledgementBySopAndUser(sopId, userId);
    if (!existing) {
      await complianceModel.createAcknowledgement({ sop_id: sopId, user_id: userId, status: 'Pending' });
      results.created += 1;
    } else if (existing.status === 'Acknowledged') {
      await complianceModel.updateAcknowledgementStatus(sopId, userId, 'Pending');
      results.reset += 1;
    } else {
      results.skipped += 1;
    }
  }

  return results;
}

module.exports = {
  listAcknowledgements,
  listPendingAcknowledgements,
  listUserAcknowledgements,
  getAcknowledgementStats,
  createAcknowledgement,
  acknowledgeSop,
  generateAcknowledgementsOnPublish,
};

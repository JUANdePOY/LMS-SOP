const sopModel = require('../models/sopModel');
const sopVersionModel = require('../models/sopVersionModel');
const sopApprovalModel = require('../models/sopApprovalModel');
const sopAcknowledgementService = require('./sopAcknowledgementService');
const sopApprovalService = require('./sopApprovalService');
const { canTransitionTo } = require('../utils/sopUtils');
const { logAudit } = require('../utils/auditLogger');
const db = require('../config/database');
const sopAuditLogService = require('./sopAuditLogService');

async function transitionSop(sopId, nextStatus, actorId, metadata = {}) {
  const sop = await sopModel.findById(sopId);
  if (!sop) {
    const error = new Error('SOP not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (!canTransitionTo(sop.status, nextStatus)) {
    const error = new Error(`Invalid transition from ${sop.status} to ${nextStatus}`);
    error.code = 'INVALID_TRANSITION';
    throw error;
  }

  if (nextStatus === 'For Review') {
    await sopApprovalService.createSopApprovals(sopId, actorId);
  }

  if (nextStatus === 'Approved' || nextStatus === 'Published') {
    const approvals = await sopApprovalModel.getApprovals(sopId);
    const pending = approvals.filter((a) => a.status === 'pending');
    const rejected = approvals.filter((a) => a.status === 'rejected');

    if (rejected.length > 0) {
      const error = new Error('Cannot transition: SOP has rejected approvals');
      error.code = 'APPROVAL_PENDING';
      throw error;
    }

    if (pending.length > 0) {
      const error = new Error('Cannot transition: SOP has pending approvals');
      error.code = 'APPROVAL_PENDING';
      throw error;
    }
  }

  const versionId = await sopVersionModel.ensureCurrentVersion(sopId, actorId);

  await sopModel.update(sopId, { status: nextStatus });

  const versionSets = ['status = ?'];
  const versionParams = [nextStatus];
  if (nextStatus === 'Published') {
    versionSets.push('published_at = CURRENT_TIMESTAMP');
  }
  if (nextStatus === 'Archived') {
    versionSets.push('archived_at = CURRENT_TIMESTAMP');
  }
  versionParams.push(versionId);
  await db.query(`UPDATE sop_versions SET ${versionSets.join(', ')} WHERE id = ?`, versionParams);

  await db.query(`
    INSERT INTO sop_change_logs (sop_version_id, field_name, old_value, new_value, changed_by, changed_at)
    VALUES (?, 'status', ?, ?, ?, CURRENT_TIMESTAMP)
  `, [versionId, sop.status, nextStatus, actorId || null]);

  logAudit({
    user_id: actorId,
    action: 'sop.status_transitioned',
    entity_type: 'sop',
    entity_id: sopId,
    metadata: { from: sop.status, to: nextStatus, ...metadata },
  });

  await sopAuditLogService.logEntry({
    entity_type: 'sop',
    entity_id: sopId,
    action: 'sop.status_transitioned',
    performed_by: actorId,
    old_values: { status: sop.status },
    new_values: { status: nextStatus },
  });

  let acknowledgements = null;
  if (nextStatus === 'Published') {
    acknowledgements = await sopAcknowledgementService.generateAcknowledgementsOnPublish(sopId);
  }

  return { from: sop.status, to: nextStatus, acknowledgements };
}

module.exports = {
  transitionSop,
};
const sopApprovalModel = require('../models/sopApprovalModel');
const sopModel = require('../models/sopModel');
const sopVersionModel = require('../models/sopVersionModel');
const approvalWorkflowService = require('./approvalWorkflowService');
const { logAudit } = require('../utils/auditLogger');

async function listApprovals(sopId) {
  return sopApprovalModel.getApprovals(sopId);
}

async function getApprovalById(approvalId) {
  const approval = await sopApprovalModel.getApprovalById(approvalId);
  if (!approval) {
    const error = new Error('Approval not found');
    error.code = 'NOT_FOUND';
    throw error;
  }
  return approval;
}

async function createApproval(sopId, data, actorId) {
  const sop = await sopModel.findById(sopId);
  if (!sop) {
    const error = new Error('SOP not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const version = await sopVersionModel.getCurrentVersion(sopId);

  const id = await sopApprovalModel.createApproval({
    sop_id: sopId,
    sop_version_id: version?.id || null,
    approver_user_id: data.approver_user_id || actorId,
    status: data.status || 'pending',
    comments: data.comments || null,
  });

  logAudit({
    user_id: actorId,
    action: 'sop.approval.created',
    entity_type: 'sop_approval',
    entity_id: id,
    metadata: { sop_id: sopId },
  });

  return { id };
}

async function updateApproval(approvalId, data, actorId) {
  const existing = await sopApprovalModel.getApprovalById(approvalId);
  if (!existing) {
    const error = new Error('Approval not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  await sopApprovalModel.updateApproval(approvalId, {
    status: data.status,
    comments: data.comments,
  });

  logAudit({
    user_id: actorId,
    action: 'sop.approval.updated',
    entity_type: 'sop_approval',
    entity_id: approvalId,
    metadata: { sop_id: existing.sop_id, status: data.status },
  });

  return { affectedRows: 1 };
}

async function approveApproval(approvalId, actorId, comments) {
  const existing = await sopApprovalModel.getApprovalById(approvalId);
  if (!existing) {
    const error = new Error('Approval not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (existing.status !== 'pending') {
    const error = new Error('Approval is not pending');
    error.code = 'APPROVAL_PENDING';
    throw error;
  }

  if (existing.approver_user_id !== actorId) {
    const error = new Error('Only the assigned approver can approve');
    error.code = 'UNAUTHORIZED';
    throw error;
  }

  await sopApprovalModel.updateApproval(approvalId, {
    status: 'approved',
    comments: comments || null,
  });

  logAudit({
    user_id: actorId,
    action: 'sop.approval.approved',
    entity_type: 'sop_approval',
    entity_id: approvalId,
    metadata: { sop_id: existing.sop_id, comments },
  });

  await checkAndTransitionSop(existing.sop_id);

  return { id: approvalId, status: 'approved' };
}

async function rejectApproval(approvalId, actorId, comments) {
  const existing = await sopApprovalModel.getApprovalById(approvalId);
  if (!existing) {
    const error = new Error('Approval not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (existing.status !== 'pending') {
    const error = new Error('Approval is not pending');
    error.code = 'APPROVAL_PENDING';
    throw error;
  }

  if (existing.approver_user_id !== actorId) {
    const error = new Error('Only the assigned approver can reject');
    error.code = 'UNAUTHORIZED';
    throw error;
  }

  if (!comments || !comments.trim()) {
    const error = new Error('Rejection requires a comment');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  await sopApprovalModel.updateApproval(approvalId, {
    status: 'rejected',
    comments,
  });

  logAudit({
    user_id: actorId,
    action: 'sop.approval.rejected',
    entity_type: 'sop_approval',
    entity_id: approvalId,
    metadata: { sop_id: existing.sop_id, comments },
  });

  await checkAndTransitionSop(existing.sop_id);

  return { id: approvalId, status: 'rejected' };
}

async function checkAndTransitionSop(sopId) {
  const approvals = await sopApprovalModel.getApprovals(sopId);
  const pending = approvals.filter((a) => a.status === 'pending');
  const rejected = approvals.filter((a) => a.status === 'rejected');

  if (rejected.length > 0) {
    const { transitionSop } = require('./sopWorkflowService');
    const sop = await sopModel.findById(sopId);
    if (sop && sop.status === 'For Review') {
      await transitionSop(sopId, 'Draft', null, { reason: 'Approval rejected' });
    }
    return;
  }

  if (pending.length === 0 && approvals.length > 0) {
    const allApproved = approvals.every((a) => a.status === 'approved');
    if (allApproved) {
      const sop = await sopModel.findById(sopId);
      if (sop && sop.status === 'For Review') {
        const { transitionSop } = require('./sopWorkflowService');
        await transitionSop(sopId, 'Approved', null, { reason: 'All approvals resolved' });
      }
    }
  }
}

module.exports = {
  listApprovals,
  getApprovalById,
  createApproval,
  updateApproval,
  approveApproval,
  rejectApproval,
};
const sopModel = require('../models/sopModel');
const sopVersionModel = require('../models/sopVersionModel');
const sopAcknowledgementService = require('./sopAcknowledgementService');
const approvalWorkflowService = require('./approvalWorkflowService');
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
    await approvalWorkflowService.startWorkflow(sopId, actorId);
  }

  if (nextStatus === 'Approved' || nextStatus === 'Published') {
    const workflowInstance = await approvalWorkflowService.getWorkflowInstance(sopId);
    if (!workflowInstance || workflowInstance.status !== 'Approved') {
      let pendingSteps = [];
      if (workflowInstance) {
        const steps = await approvalWorkflowService.getWorkflowSteps(workflowInstance.workflow_id);
        const actions = await approvalWorkflowService.getWorkflowActions(workflowInstance.id);
        pendingSteps = steps
          .filter((step) => {
            const stepActions = actions.filter((a) => a.workflow_step_id === step.id);
            const latestAction = stepActions.length > 0 ? stepActions[stepActions.length - 1] : null;
            return !latestAction || latestAction.action !== 'Approved';
          })
          .map((step) => step.step_name);
      }
      const pendingMsg = pendingSteps.length > 0 ? ` Pending steps not approved: ${pendingSteps.join(', ')}.` : '';
      const error = new Error(`Cannot transition: SOP workflow is not fully approved.${pendingMsg}`);
      error.code = 'APPROVAL_PENDING';
      throw error;
    }
  }

  if (nextStatus === 'Draft') {
    const workflowInstance = await approvalWorkflowService.getWorkflowInstance(sopId);
    if (workflowInstance && workflowInstance.status === 'Rejected') {
      // SOP was rejected — allow transition back to Draft
    } else if (!workflowInstance) {
      // No workflow instance exists — allow transition (legacy fallback)
    } else {
      const error = new Error('Cannot transition: SOP workflow is not rejected');
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
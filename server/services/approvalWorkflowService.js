const db = require('../config/database');
const approvalWorkflowModel = require('../models/approvalWorkflowModel');
const sopVersionModel = require('../models/sopVersionModel');
const sopModel = require('../models/sopModel');
const { logAudit } = require('../utils/auditLogger');

async function listWorkflows(filters = {}) {
  return approvalWorkflowModel.getWorkflows(filters);
}

async function getWorkflowById(id) {
  const workflow = await approvalWorkflowModel.getWorkflowById(id);
  if (!workflow) {
    const error = new Error('Workflow not found');
    error.code = 'NOT_FOUND';
    throw error;
  }
  const steps = await approvalWorkflowModel.getWorkflowSteps(id);
  return { ...workflow, steps };
}

async function createWorkflow(data, actorId) {
  if (!data.name || !data.name.trim()) {
    const error = new Error('Workflow name is required');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const id = await approvalWorkflowModel.createWorkflow(data, actorId);

  if (data.steps && Array.isArray(data.steps)) {
    for (let i = 0; i < data.steps.length; i++) {
      const step = data.steps[i];
      await approvalWorkflowModel.createWorkflowStep({
        workflow_id: id,
        step_order: i + 1,
        step_name: step.step_name,
        approver_type: step.approver_type || 'Role',
        approver_reference_id: step.approver_reference_id || null,
        approver_role: step.approver_role || null,
        is_required: step.is_required !== undefined ? step.is_required : 1,
      });
    }
  }

  logAudit({
    user_id: actorId,
    action: 'approval.workflow.created',
    entity_type: 'approval_workflow',
    entity_id: id,
    metadata: { name: data.name },
  });

  return { id, ...data };
}

async function startWorkflow(sopId, actorId) {
  const sop = await sopModel.findById(sopId);
  if (!sop) {
    const error = new Error('SOP not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (sop.status !== 'For Review' && sop.status !== 'Draft') {
    const error = new Error('SOP must be in For Review or Draft status to start workflow');
    error.code = 'INVALID_TRANSITION';
    throw error;
  }

  const version = await sopVersionModel.getCurrentVersion(sopId);
  if (!version) {
    const error = new Error('No current version found for SOP');
    error.code = 'NOT_FOUND';
    throw error;
  }

  // Find org-wide default workflow (department_id = NULL)
  const workflows = await approvalWorkflowModel.getWorkflows({ is_active: true });
  const defaultWorkflow = workflows.find((w) => w.department_id === null);

  if (!defaultWorkflow) {
    const error = new Error('No approval workflow configured');
    error.code = 'WORKFLOW_NOT_FOUND';
    throw error;
  }

  const instanceId = await approvalWorkflowModel.createWorkflowInstance({
    sop_version_id: version.id,
    workflow_id: defaultWorkflow.id,
    created_by: actorId,
  });

  logAudit({
    user_id: actorId,
    action: 'approval.workflow.started',
    entity_type: 'workflow_instance',
    entity_id: instanceId,
    metadata: { sop_id: sopId, workflow_id: defaultWorkflow.id },
  });

  return { instanceId, workflow_id: defaultWorkflow.id, sop_id: sopId };
}

async function advanceStep(instanceId, stepId, actorId, action, comments) {
  const validActions = ['Submitted', 'Approved', 'Rejected', 'Delegated', 'Commented'];
  if (!validActions.includes(action)) {
    const error = new Error(`Invalid action: ${action}`);
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const instance = await approvalWorkflowModel.getWorkflowInstanceById(instanceId);
  if (!instance) {
    const error = new Error('Workflow instance not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (instance.status !== 'In Progress') {
    const error = new Error(`Workflow is already ${instance.status}`);
    error.code = 'INVALID_TRANSITION';
    throw error;
  }

// Role-based authorization: check if actor has the required role for this step
const step = await approvalWorkflowModel.getWorkflowSteps(instance.workflow_id);
const targetStep = step.find((s) => s.id === stepId);
if (targetStep && targetStep.approver_role) {
  const [userRows] = await db.query(
    'SELECT role FROM users WHERE id = ? AND is_active = TRUE',
    [actorId]
  );
  const user = userRows[0];
  if (!user) {
    const error = new Error('User not found or inactive');
    error.code = 'NOT_FOUND';
    throw error;
  }
  if (user.role !== targetStep.approver_role) {
    const error = new Error(
      `You are not authorized to approve this step. Required role: ${targetStep.approver_role}, your role: ${user.role}`
    );
    error.code = 'UNAUTHORIZED';
    throw error;
  }
}

  await approvalWorkflowModel.advanceWorkflowStep(instanceId, stepId, actorId, action, comments);

  let newStatus = 'In Progress';
  let completedAt = null;

  if (action === 'Rejected') {
    newStatus = 'Rejected';
    completedAt = new Date();
  } else if (action === 'Approved') {
    const completion = await approvalWorkflowModel.isWorkflowComplete(instanceId);
    if (completion.complete) {
      newStatus = 'Approved';
      completedAt = new Date();
    }
  }

  if (newStatus !== 'In Progress') {
    await approvalWorkflowModel.updateWorkflowInstanceStatus(instanceId, newStatus, completedAt);
  }

  logAudit({
    user_id: actorId,
    action: `approval.workflow.${action.toLowerCase()}`,
    entity_type: 'workflow_action',
    entity_id: instanceId,
    metadata: { step_id: stepId, action, comments },
  });

  return { instanceId, action, status: newStatus };
}

async function getWorkflowInstance(sopId) {
  const version = await sopVersionModel.getCurrentVersion(sopId);
  if (!version) return null;
  return approvalWorkflowModel.getWorkflowInstance(version.id);
}

async function getWorkflowStatus(sopId) {
  const instance = await getWorkflowInstance(sopId);
  if (!instance) return null;

  const steps = await approvalWorkflowModel.getWorkflowSteps(instance.workflow_id);
  const actions = await approvalWorkflowModel.getWorkflowActions(instance.id);

  const stepsWithStatus = steps.map((step) => {
    const stepActions = actions.filter((a) => a.workflow_step_id === step.id);
    const latestAction = stepActions.length > 0 ? stepActions[stepActions.length - 1] : null;
    return {
      ...step,
      status: latestAction ? latestAction.action : 'Pending',
      actor_id: latestAction ? latestAction.actor_id : null,
      comments: latestAction ? latestAction.comments : null,
      action_at: latestAction ? latestAction.action_at : null,
    };
  });

  return { ...instance, steps: stepsWithStatus };
}

module.exports = {
  listWorkflows,
  getWorkflowById,
  createWorkflow,
  startWorkflow,
  advanceStep,
  getWorkflowInstance,
  getWorkflowStatus,
  getWorkflowSteps: approvalWorkflowModel.getWorkflowSteps,
  getWorkflowActions: approvalWorkflowModel.getWorkflowActions,
};
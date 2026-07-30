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

  if (sop.status !== 'For Review') {
    const error = new Error('SOP must be in For Review status to start workflow');
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

module.exports = {
  listWorkflows,
  getWorkflowById,
  createWorkflow,
  startWorkflow,
  advanceStep,
  getWorkflowInstance,
};

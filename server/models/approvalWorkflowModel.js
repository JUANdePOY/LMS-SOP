const db = require('../config/database');

async function getWorkflows(filters = {}) {
  const { department_id, is_active } = filters;
  let sql = `
    SELECT aw.*
    FROM approval_workflows aw
    WHERE aw.deleted_at IS NULL
  `;
  const params = [];

  if (department_id !== undefined) {
    sql += ' AND aw.department_id = ?';
    params.push(department_id);
  }
  if (is_active !== undefined) {
    sql += ' AND aw.is_active = ?';
    params.push(is_active);
  }

  sql += ' ORDER BY aw.name ASC';

  const [rows] = await db.query(sql, params);
  return rows;
}

async function getWorkflowById(id) {
  const [rows] = await db.query(
    'SELECT * FROM approval_workflows WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  return rows[0] || null;
}

async function getWorkflowSteps(workflowId) {
  const [rows] = await db.query(
    'SELECT * FROM workflow_steps WHERE workflow_id = ? AND deleted_at IS NULL ORDER BY step_order ASC',
    [workflowId]
  );
  return rows;
}

async function createWorkflow(data, actorId) {
  const { name, department_id, description } = data;
  const [result] = await db.query(
    'INSERT INTO approval_workflows (name, department_id, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
    [name, department_id || null, description || null, actorId]
  );
  return result.insertId;
}

async function createWorkflowStep(data) {
  const { workflow_id, step_order, step_name, approver_type, approver_reference_id, approver_role, is_required } = data;
  const [result] = await db.query(
    'INSERT INTO workflow_steps (workflow_id, step_order, step_name, approver_type, approver_reference_id, approver_role, is_required, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
    [workflow_id, step_order, step_name, approver_type, approver_reference_id || null, approver_role || null, is_required !== undefined ? is_required : 1]
  );
  return result.insertId;
}

async function createWorkflowInstance(data) {
  const { sop_version_id, workflow_id, created_by } = data;
  const [result] = await db.query(
    'INSERT INTO workflow_instances (sop_version_id, workflow_id, current_step_order, status, started_at, completed_at, created_by) VALUES (?, ?, 1, \'In Progress\', CURRENT_TIMESTAMP, NULL, ?)',
    [sop_version_id, workflow_id, created_by]
  );
  return result.insertId;
}

async function getWorkflowInstance(sopVersionId) {
  const [rows] = await db.query(
    'SELECT * FROM workflow_instances WHERE sop_version_id = ? AND status IN (\'In Progress\', \'Approved\') ORDER BY started_at DESC LIMIT 1',
    [sopVersionId]
  );
  return rows[0] || null;
}

async function getWorkflowInstanceById(instanceId) {
  const [rows] = await db.query(
    'SELECT * FROM workflow_instances WHERE id = ?',
    [instanceId]
  );
  return rows[0] || null;
}

async function advanceWorkflowStep(instanceId, stepId, actorId, action, comments) {
  const [result] = await db.query(
    'INSERT INTO workflow_actions (workflow_instance_id, workflow_step_id, actor_id, action, comments, action_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
    [instanceId, stepId, actorId, action, comments || null]
  );
  return result.insertId;
}

async function updateWorkflowInstanceStatus(instanceId, status, completedAt) {
  const sets = ['status = ?'];
  const params = [status];

  if (completedAt) {
    sets.push('completed_at = ?');
    params.push(completedAt);
  }

  await db.query(
    `UPDATE workflow_instances SET ${sets.join(', ')} WHERE id = ?`,
    [...params, instanceId]
  );
}

async function getCurrentStep(instanceId) {
  const [rows] = await db.query(`
    SELECT ws.* FROM workflow_steps ws
    INNER JOIN workflow_instances wi ON ws.workflow_id = wi.workflow_id
    WHERE wi.id = ? AND ws.step_order >= wi.current_step_order AND ws.deleted_at IS NULL
    ORDER BY ws.step_order ASC LIMIT 1
  `, [instanceId]);
  return rows[0] || null;
}

async function getWorkflowActions(instanceId) {
  const [rows] = await db.query(
    'SELECT * FROM workflow_actions WHERE workflow_instance_id = ? ORDER BY action_at ASC',
    [instanceId]
  );
  return rows;
}

async function isWorkflowComplete(instanceId) {
  const [rows] = await db.query(`
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN wa.action = 'Approved' THEN 1 ELSE 0 END) AS approved_count
    FROM workflow_steps ws
    LEFT JOIN workflow_actions wa ON wa.workflow_step_id = ws.id
      AND wa.workflow_instance_id = ?
      AND wa.action IN ('Approved', 'Rejected')
    WHERE ws.workflow_id = (SELECT workflow_id FROM workflow_instances WHERE id = ?)
      AND ws.deleted_at IS NULL
  `, [instanceId, instanceId]);

  const total = parseInt(rows[0]?.total || 0, 10);
  const approved = parseInt(rows[0]?.approved_count || 0, 10);
  return { total, approved, complete: total > 0 && approved === total };
}

module.exports = {
  getWorkflows,
  getWorkflowById,
  getWorkflowSteps,
  getWorkflowActions,
  createWorkflow,
  createWorkflowStep,
  createWorkflowInstance,
  getWorkflowInstance,
  getWorkflowInstanceById,
  advanceWorkflowStep,
  updateWorkflowInstanceStatus,
  getCurrentStep,
  isWorkflowComplete,
};

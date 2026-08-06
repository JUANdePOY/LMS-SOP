const db = require('../config/database');
const taskModel = require('../models/taskModel');
const taskAssignmentModel = require('../models/taskAssignmentModel');
const taskProgressModel = require('../models/taskProgressModel');
const taskAttachmentModel = require('../models/taskAttachmentModel');
const { buildViewUrl } = require('../services/taskAttachmentPublicFile');
const taskCommentModel = require('../models/taskCommentModel');
const { logAudit } = require('../utils/auditLogger');
const { validateTaskPayload, validateAssignmentPayload, validateProgressPayload, validateCommentPayload } = require('../validators/taskValidator');

function computeAutoStatus(startDatetime, deadlineDatetime, currentStatus) {
  if (currentStatus === 'Completed' || currentStatus === 'Cancelled') {
    return currentStatus;
  }

  // Only auto-compute from dates when status is still the default/unset state
  if (currentStatus !== 'Pending') {
    return currentStatus;
  }

  const now = new Date();
  const start = new Date(startDatetime);
  const deadline = new Date(deadlineDatetime);

  if (now < start) {
    return 'Pending';
  }
  if (now >= start && now < deadline) {
    return 'In Progress';
  }
  if (now >= deadline) {
    return 'Overdue';
  }
  return currentStatus;
}

async function listTasks(filters = {}, actorId) {
  const isAdmin = await isUserAdmin(actorId);
  if (!isAdmin) {
    const assignedTaskIds = await getAssignedTaskIdsForUser(actorId);
    if (!filters.assigned_to_me) {
      filters.task_ids = assignedTaskIds;
    }
  }

  const result = await taskModel.findAll(filters);

  const taskIds = result.rows.map((task) => task.id);
  let progressMap = {};
  if (taskIds.length > 0) {
    const [progressRows] = await db.query(
      `SELECT tp.task_id, tp.completion_rate
       FROM task_progress tp
       INNER JOIN (
         SELECT task_id, MAX(updated_at) AS max_updated
         FROM task_progress
         WHERE task_id IN (?)
         GROUP BY task_id
       ) latest ON tp.task_id = latest.task_id AND tp.updated_at = latest.max_updated`,
      [taskIds]
    );
    progressRows.forEach((p) => {
      progressMap[p.task_id] = p.completion_rate;
    });
  }

  const rows = result.rows.map((task) => ({
    ...task,
    status: computeAutoStatus(task.start_datetime, task.deadline_datetime, task.status),
    progress_rate: progressMap[task.id] ?? null,
  }));

  return { ...result, rows };
}

async function getTask(id, actorId) {
  const task = await taskModel.findById(id);
  if (!task) {
    const error = new Error('Task not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const isAdmin = await isUserAdmin(actorId);
  if (!isAdmin && !isUserAssignedToTask(actorId, id)) {
    const error = new Error('You are not authorized to view this task');
    error.code = 'FORBIDDEN';
    throw error;
  }

  const assignments = await taskAssignmentModel.findByTaskId(id);
  const progress = await taskProgressModel.findByTaskId(id);
  const comments = await taskCommentModel.findByTaskId(id);

  const enrichedAssignments = await Promise.all(assignments.map(async (assignment) => {
    if (assignment.assignment_type === 'User') {
      const [users] = await db.query(
        'SELECT id, full_name, email FROM users WHERE id = ? LIMIT 1',
        [assignment.reference_id]
      );
      return { ...assignment, reference_name: users[0]?.full_name || null };
    }
    if (assignment.assignment_type === 'Department') {
      const [depts] = await db.query(
        'SELECT id, name, code FROM departments WHERE id = ? LIMIT 1',
        [assignment.reference_id]
      );
      return { ...assignment, reference_name: depts[0]?.name || null };
    }
    if (assignment.assignment_type === 'Position') {
      return { ...assignment, reference_name: assignment.reference_id };
    }
    return assignment;
  }));

  const enrichedProgress = await Promise.all(progress.map(async (p) => {
    const attachments = await taskAttachmentModel.findByProgressId(p.id);
    return { ...p, attachments };
  }));

  const autoStatus = computeAutoStatus(task.start_datetime, task.deadline_datetime, task.status);

  return {
    ...task,
    auto_status: autoStatus,
    status: autoStatus,
    assignments: enrichedAssignments,
    progress: enrichedProgress,
    comments,
  };
}

async function createTask(payload, actorId) {
  const validation = validateTaskPayload(payload, true);
  if (!validation.valid) {
    const error = new Error('Validation failed');
    error.code = 'VALIDATION_ERROR';
    error.details = validation.errors;
    throw error;
  }

  const { title, description, priority, status, start_datetime, deadline_datetime, estimated_hours, category } = validation.value;

  if (new Date(deadline_datetime) <= new Date(start_datetime)) {
    const error = new Error('Deadline must be after start date and time');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const taskId = await taskModel.create({
    title,
    description,
    priority: priority || 'Medium',
    status: status || 'Pending',
    start_datetime,
    deadline_datetime,
    estimated_hours,
    category,
    created_by: actorId,
  });

  const assignments = Array.isArray(payload.assignments) ? payload.assignments : [];
  if (assignments.length === 0) {
    const error = new Error('At least one assignment is required');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  for (const assignment of assignments) {
    const assignmentValidation = validateAssignmentPayload({ ...assignment, task_id: taskId });
    if (!assignmentValidation.valid) {
      const error = new Error('Invalid assignment');
      error.code = 'VALIDATION_ERROR';
      error.details = assignmentValidation.errors;
      throw error;
    }
    await taskAssignmentModel.create({
      task_id: taskId,
      assignment_type: assignmentValidation.value.assignment_type,
      reference_id: assignmentValidation.value.reference_id,
      assigned_by: actorId,
    });
  }

  logAudit('task.create', actorId, { task_id: taskId, title });

  return await getTask(taskId, actorId);
}

async function updateTask(id, payload, actorId) {
  const task = await taskModel.findById(id);
  if (!task) {
    const error = new Error('Task not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const isAdmin = await isUserAdmin(actorId);
  if (task.created_by !== actorId && !isAdmin) {
    const error = new Error('You are not authorized to update this task');
    error.code = 'FORBIDDEN';
    throw error;
  }

  const validation = validateTaskPayload(payload, false);
  if (!validation.valid) {
    const error = new Error('Validation failed');
    error.code = 'VALIDATION_ERROR';
    error.details = validation.errors;
    throw error;
  }

  if (validation.value.deadline_datetime && validation.value.start_datetime) {
    if (new Date(validation.value.deadline_datetime) <= new Date(validation.value.start_datetime)) {
      const error = new Error('Deadline must be after start date and time');
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
  }

  await taskModel.update(id, validation.value);

  logAudit('task.update', actorId, { task_id: id, changes: validation.value });

  return await getTask(id, actorId);
}

async function deleteTask(id, actorId) {
  const task = await taskModel.findById(id);
  if (!task) {
    const error = new Error('Task not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const isAdmin = await isUserAdmin(actorId);
  if (task.created_by !== actorId && !isAdmin) {
    const error = new Error('You are not authorized to delete this task');
    error.code = 'FORBIDDEN';
    throw error;
  }

  await taskAssignmentModel.removeByTaskId(id);
  await taskCommentModel.removeByTaskId(id);
  await taskModel.remove(id);

  logAudit('task.delete', actorId, { task_id: id, title: task.title });
}

async function assignTask(payload, actorId) {
  const validation = validateAssignmentPayload(payload);
  if (!validation.valid) {
    const error = new Error('Validation failed');
    error.code = 'VALIDATION_ERROR';
    error.details = validation.errors;
    throw error;
  }

  const task = await taskModel.findById(validation.value.task_id);
  if (!task) {
    const error = new Error('Task not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const isAdmin = await isUserAdmin(actorId);
  if (task.created_by !== actorId && !isAdmin) {
    const error = new Error('You are not authorized to assign this task');
    error.code = 'FORBIDDEN';
    throw error;
  }

  const existing = await taskAssignmentModel.findByTaskAndRef(
    validation.value.task_id,
    validation.value.assignment_type,
    validation.value.reference_id
  );
  if (existing) {
    const error = new Error('This assignment already exists');
    error.code = 'DUPLICATE_ASSIGNMENT';
    throw error;
  }

  const assignmentId = await taskAssignmentModel.create({
    task_id: validation.value.task_id,
    assignment_type: validation.value.assignment_type,
    reference_id: validation.value.reference_id,
    assigned_by: actorId,
  });

  logAudit('task.assign', actorId, {
    task_id: validation.value.task_id,
    assignment_id: assignmentId,
    assignment_type: validation.value.assignment_type,
    reference_id: validation.value.reference_id,
  });

  return await taskAssignmentModel.findById(assignmentId);
}

async function unassignTask(taskId, assignmentType, referenceId, actorId) {
  const task = await taskModel.findById(taskId);
  if (!task) {
    const error = new Error('Task not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const isAdmin = await isUserAdmin(actorId);
  if (task.created_by !== actorId && !isAdmin) {
    const error = new Error('You are not authorized to unassign this task');
    error.code = 'FORBIDDEN';
    throw error;
  }

  await taskAssignmentModel.removeByTaskAndRef(taskId, assignmentType, referenceId);

  logAudit('task.unassign', actorId, { task_id: taskId, assignment_type: assignmentType, reference_id: referenceId });
}

async function updateProgress(payload, actorId) {
  const validation = validateProgressPayload(payload);
  if (!validation.valid) {
    const error = new Error('Validation failed');
    error.code = 'VALIDATION_ERROR';
    error.details = validation.errors;
    throw error;
  }

  const { task_id, completion_rate, status, notes } = validation.value;

  const task = await taskModel.findById(task_id);
  if (!task) {
    const error = new Error('Task not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const isAdmin = await isUserAdmin(actorId);
  const isAssigned = await isUserAssignedToTask(actorId, task_id);
  if (!isAdmin && !isAssigned) {
    const error = new Error('You are not authorized to update progress for this task');
    error.code = 'FORBIDDEN';
    throw error;
  }

  const autoStatus = computeAutoStatus(task.start_datetime, task.deadline_datetime, task.status);
  const finalStatus = status || autoStatus;

  if (finalStatus === 'Completed' && (!completion_rate || completion_rate < 100)) {
    const error = new Error('Completion rate must be 100% when marking as completed');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  await taskProgressModel.create({
    task_id,
    user_id: actorId,
    completion_rate: completion_rate ?? 0,
    status: finalStatus,
    notes,
  });

  await taskModel.update(task_id, { status: finalStatus });

  logAudit('task.progress.update', actorId, {
    task_id,
    completion_rate: completion_rate ?? 0,
    status: finalStatus,
  });

  const updated = await taskProgressModel.findByTaskAndUser(task_id, actorId);
  return updated;
}

async function addComment(payload, actorId) {
  const validation = validateCommentPayload(payload);
  if (!validation.valid) {
    const error = new Error('Validation failed');
    error.code = 'VALIDATION_ERROR';
    error.details = validation.errors;
    throw error;
  }

  const { task_id, comment } = validation.value;

  const task = await taskModel.findById(task_id);
  if (!task) {
    const error = new Error('Task not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const isAdmin = await isUserAdmin(actorId);
  const isAssigned = await isUserAssignedToTask(actorId, task_id);
  if (!isAdmin && !isAssigned) {
    const error = new Error('You are not authorized to comment on this task');
    error.code = 'FORBIDDEN';
    throw error;
  }

  const commentId = await taskCommentModel.create({
    task_id,
    user_id: actorId,
    comment,
  });

  logAudit('task.comment.create', actorId, { task_id, comment_id });

  return await taskCommentModel.findById(commentId);
}

async function uploadAttachment(taskId, file, actorId, req) {
  const task = await taskModel.findById(taskId);
  if (!task) {
    const error = new Error('Task not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const isAdmin = await isUserAdmin(actorId);
  const isAssigned = await isUserAssignedToTask(actorId, taskId);
  if (!isAdmin && !isAssigned) {
    const error = new Error('You are not authorized to upload attachments for this task');
    error.code = 'FORBIDDEN';
    throw error;
  }

  const validation = taskAttachmentModel.validateAttachment(file.mimetype, file.originalname);
  if (!validation.valid) {
    const error = new Error(validation.error);
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const originalName = file.originalname || 'attachment';
  const fileSize = file.size || (file.buffer ? file.buffer.length : 0);

  const attachmentId = await taskAttachmentModel.create({
    task_progress_id: null,
    task_id: taskId,
    file_name: originalName,
    original_name: originalName,
    mime_type: file.mimetype,
    size_bytes: fileSize,
    file_data: file.buffer || null,
    uploaded_by: actorId,
  });

  logAudit('task.attachment.upload', actorId, { task_id: taskId, attachment_id: attachmentId });

  const attachment = await taskAttachmentModel.findById(attachmentId);
  return { ...attachment, view_url: buildViewUrl(attachmentId, req) };
}

async function deleteAttachment(attachmentId, actorId) {
  const attachment = await taskAttachmentModel.findById(attachmentId);
  if (!attachment) {
    const error = new Error('Attachment not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const task = await taskModel.findById(attachment.task_id);
  if (!task) {
    const error = new Error('Task not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const isAdmin = await isUserAdmin(actorId);
  const isAssigned = await isUserAssignedToTask(actorId, attachment.task_id);
  if (!isAdmin && !isAssigned) {
    const error = new Error('You are not authorized to delete this attachment');
    error.code = 'FORBIDDEN';
    throw error;
  }

  await taskAttachmentModel.remove(attachmentId);

  logAudit('task.attachment.delete', actorId, { task_id: attachment.task_id, attachment_id: attachmentId });
}

async function getMyTasks(userId, filters = {}) {
  const isAdmin = await isUserAdmin(userId);
  if (isAdmin) {
    return await taskModel.findAll(filters);
  }

  const assignedTaskIds = await getAssignedTaskIdsForUser(userId);
  if (assignedTaskIds.length === 0) {
    return { rows: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  }

  filters.task_ids = assignedTaskIds;
  return await taskModel.findAll(filters);
}

async function getTaskStats(filters = {}, actorId) {
  const isAdmin = await isUserAdmin(actorId);
  if (!isAdmin) {
    filters.created_by = actorId;
  }
  return await taskModel.getStats(filters);
}

async function isUserAdmin(userId) {
  const [users] = await db.query(
    'SELECT role FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  const user = users[0];
  return user && ['super_admin', 'admin', 'department_head'].includes(user.role);
}

async function isUserAssignedToTask(userId, taskId) {
  const [assignments] = await db.query(
    `SELECT ta.id FROM task_assignments ta
     WHERE ta.task_id = ?
     AND (
       ta.assignment_type = 'User' AND ta.reference_id = ?
       OR ta.assignment_type = 'Department' AND ta.reference_id = (
         SELECT u.department_id FROM users u WHERE u.id = ?
       )
       OR ta.assignment_type = 'Position' AND ta.reference_id = (
         SELECT u.position_title FROM users u WHERE u.id = ?
       )
     )
     LIMIT 1`,
    [taskId, userId, userId, userId]
  );
  return assignments.length > 0;
}

async function getAssignedTaskIdsForUser(userId) {
  const [users] = await db.query(
    'SELECT department_id, position_title FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  if (!users || users.length === 0) return [];

  const user = users[0];

  const [rows] = await db.query(
    `SELECT DISTINCT ta.task_id
     FROM task_assignments ta
     WHERE ta.task_id NOT IN (
       SELECT id FROM tasks WHERE status IN ('Completed', 'Cancelled')
     )
     AND (
       ta.assignment_type = 'User' AND ta.reference_id = ?
       OR ta.assignment_type = 'Department' AND ta.reference_id = ?
       OR ta.assignment_type = 'Position' AND ta.reference_id = ?
     )`,
    [userId, user.department_id, user.position_title]
  );

  return rows.map(r => r.task_id);
}

async function getMyTaskCount(userId) {
  const isAdmin = await isUserAdmin(userId);
  if (isAdmin) {
    const [countRow] = await db.query(
      "SELECT COUNT(*) AS total FROM tasks WHERE status NOT IN ('Completed', 'Cancelled')"
    );
    return countRow[0]?.total ?? 0;
  }

  const [users] = await db.query('SELECT department_id, position_title FROM users WHERE id = ? LIMIT 1', [userId]);
  if (!users || users.length === 0) return 0;

  const user = users[0];
  const [countRow] = await db.query(
    `SELECT COUNT(DISTINCT ta.task_id) AS total
     FROM task_assignments ta
     WHERE ta.task_id NOT IN (
       SELECT id FROM tasks WHERE status IN ('Completed', 'Cancelled')
     )
     AND (
       ta.assignment_type = 'User' AND ta.reference_id = ?
       OR ta.assignment_type = 'Department' AND ta.reference_id = ?
       OR ta.assignment_type = 'Position' AND ta.reference_id = ?
     )`,
    [userId, user.department_id, user.position_title]
  );

  return countRow[0]?.total ?? 0;
}

module.exports = {
  computeAutoStatus,
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  assignTask,
  unassignTask,
  updateProgress,
  addComment,
  uploadAttachment,
  deleteAttachment,
  getMyTasks,
  getMyTaskCount,
  getTaskStats,
};

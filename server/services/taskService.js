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

  // Only auto-compute from dates when status is still the default/unset state.
  // Any explicit status (e.g. a user-set 'Pending' or 'In Progress') is preserved
  // as-is; progress-driven status changes are handled in updateProgress().
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

function deriveParentStatus(children) {
  if (!children || children.length === 0) return null;
  const statuses = children.map((c) => c.status);
  if (statuses.every((s) => s === 'Completed')) return 'Completed';
  if (statuses.some((s) => s === 'In Progress')) return 'In Progress';
  if (statuses.some((s) => s === 'Overdue')) return 'Overdue';
  if (statuses.every((s) => s === 'Cancelled')) return 'Cancelled';
  return 'Pending';
}

async function listTasks(filters = {}, actorId) {
  const isAdmin = await isUserAdmin(actorId);
  if (!isAdmin) {
    const assignedTaskIds = await getAssignedTaskIdsForUser(actorId);
    if (!filters.assigned_to_me) {
      filters.task_ids = assignedTaskIds;
    }
  } else if (filters.assigned_to_me) {
    const assignedTaskIds = await getAssignedTaskIdsForUser(actorId);
    filters.task_ids = assignedTaskIds;
  } else {
    const businessTaskIds = await getBusinessScopedTaskIdsForAdmin(actorId);
    filters.task_ids = businessTaskIds;
  }

  const result = await taskModel.findAll(filters);

  const taskIds = result.rows.map((task) => task.id);
  let progressMap = {};
  let assignmentsMap = {};

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

    const [assignmentRows] = await db.query(
      `SELECT ta.task_id, ta.assignment_type, ta.reference_id
       FROM task_assignments ta
       WHERE ta.task_id IN (?)
       ORDER BY ta.assigned_at ASC`,
      [taskIds]
    );

    const userIds = [...new Set(assignmentRows.filter((a) => a.assignment_type === 'User').map((a) => Number(a.reference_id)).filter(Boolean))];
    const deptIds = [...new Set(assignmentRows.filter((a) => a.assignment_type === 'Department').map((a) => Number(a.reference_id)).filter(Boolean))];

    const userMap = {};
    if (userIds.length > 0) {
      const [users] = await db.query(
        'SELECT id, full_name FROM users WHERE id IN (?)',
        [userIds]
      );
      users.forEach((u) => { userMap[u.id] = u.full_name; });
    }

        const userAvatarMap = {};
    if (userIds.length > 0) {
      const [usersWithAvatar] = await db.query(
        'SELECT id, avatar_url FROM users WHERE id IN (?)',
        [userIds]
      );
      usersWithAvatar.forEach((u) => { userAvatarMap[u.id] = u.avatar_url; });
    }

    const deptMap = {};
    if (deptIds.length > 0) {
      const [depts] = await db.query(
        'SELECT id, name FROM departments WHERE id IN (?)',
        [deptIds]
      );
      depts.forEach((d) => { deptMap[d.id] = d.name; });
    }

        assignmentRows.forEach((a) => {
      if (!assignmentsMap[a.task_id]) assignmentsMap[a.task_id] = [];
      let referenceName = null;
      let avatarUrl = null;
      if (a.assignment_type === 'User') {
        referenceName = userMap[a.reference_id] || null;
        avatarUrl = userAvatarMap[a.reference_id] || null;
      } else if (a.assignment_type === 'Department') {
        referenceName = deptMap[a.reference_id] || null;
      } else if (a.assignment_type === 'Position') {
        referenceName = a.reference_id;
      }
      assignmentsMap[a.task_id].push({ ...a, reference_name: referenceName, avatar_url: avatarUrl });
    });
  }

  const rows = result.rows.map((task) => ({
    ...task,
    // Apply the same auto-status rules used by getStats / task detail so the
    // table's status groups match the KPI card (e.g. a Pending task past its
    // deadline is shown as Overdue instead of staying Pending).
    status: computeAutoStatus(task.start_datetime, task.deadline_datetime, task.status),
    progress_rate: progressMap[task.id] ?? null,
    assignments: assignmentsMap[task.id] || [],
  }));

  // A child task can be returned on its own when the current user is directly
  // assigned to it but NOT to its parent (e.g. a sub-task on "My Tasks"). The
  // front-end table only renders tasks without a parent_task_id and nests the
  // rest under their parent, so an orphaned child would be filtered out and
  // never shown. Promote any child whose parent is missing from this result set
  // to top-level so it stays visible. Children whose parent IS present remain
  // nested as usual.
  const rowIds = new Set(rows.map((t) => t.id));
  for (const task of rows) {
    if (task.parent_task_id != null && !rowIds.has(task.parent_task_id)) {
      task.parent_task_id = null;
    }
  }

  // Build the parent -> direct children hierarchy and compute each parent's
  // auto progress rate as the average of its direct sub-tasks' progress.
  const childrenMap = {};
  for (const task of rows) {
    if (task.parent_task_id != null) {
      if (!childrenMap[task.parent_task_id]) childrenMap[task.parent_task_id] = [];
      childrenMap[task.parent_task_id].push(task);
    }
  }

  for (const task of rows) {
    const children = childrenMap[task.id];
    if (children && children.length > 0) {
      const rates = children.map((c) => Number(c.progress_rate ?? 0));
      const avg = Math.round(rates.reduce((sum, r) => sum + r, 0) / rates.length);
      task.progress_rate = avg;
      task.is_parent = true;
      task.subtasks = children;
      // Derive the parent's status from its children so the parent moves to the
      // correct status row (Completed when all done, In Progress when any child
      // is active, Overdue if any child is overdue). A Cancelled parent is left
      // as-is.
      if (task.status !== 'Cancelled') {
        const derived = deriveParentStatus(children);
        if (derived) task.status = derived;
      }
    } else {
      task.is_parent = false;
      task.subtasks = [];
    }
  }

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
  if (!isAdmin && !(await isUserAssignedToTask(actorId, id))) {
    const error = new Error('You are not authorized to view this task');
    error.code = 'FORBIDDEN';
    throw error;
  }

  if (isAdmin) {
    const businessTaskIds = await getBusinessScopedTaskIdsForAdmin(actorId);
    if (!businessTaskIds.includes(id)) {
      const error = new Error('Access denied: task is outside your business scope');
      error.code = 'FORBIDDEN';
      throw error;
    }
  }

  const assignments = await taskAssignmentModel.findByTaskId(id);
  const progress = await taskProgressModel.findByTaskId(id);
  const comments = await taskCommentModel.findByTaskId(id);
  const taskAttachments = await taskAttachmentModel.findByTaskId(id);

  const enrichedAssignments = await Promise.all(assignments.map(async (assignment) => {
    if (assignment.assignment_type === 'User') {
      const [users] = await db.query(
        'SELECT id, full_name, email, avatar_url FROM users WHERE id = ? LIMIT 1',
        [assignment.reference_id]
      );
      return { ...assignment, reference_name: users[0]?.full_name || null, avatar_url: users[0]?.avatar_url || null };
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
    const enrichedAttachments = attachments.map((att) => ({
      ...att,
      view_url: buildViewUrl(att.id),
    }));
    return { ...p, attachments: enrichedAttachments };
  }));

  const enrichedTaskAttachments = taskAttachments.map((att) => ({
    ...att,
    view_url: buildViewUrl(att.id),
  }));

  const autoStatus = computeAutoStatus(task.start_datetime, task.deadline_datetime, task.status);

  return {
    ...task,
    auto_status: autoStatus,
    status: task.status,
    assignments: enrichedAssignments,
    progress: enrichedProgress,
    comments,
    attachments: enrichedTaskAttachments,
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

  const {
    title, description, priority, status, start_datetime, deadline_datetime,
    estimated_hours, category, parent_task_id, client_id, client_business_id, business_id
  } = validation.value;

  if (new Date(deadline_datetime) <= new Date(start_datetime)) {
    const error = new Error('Deadline must be after start date and time');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const actor = await getUser(actorId);
  const assignments = Array.isArray(payload.assignments) ? payload.assignments : [];
  if (assignments.length === 0) {
    const error = new Error('At least one assignment is required');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

    for (const assignment of assignments) {
    const assignmentValidation = validateAssignmentPayload({ ...assignment, task_id: 0 });
    if (!assignmentValidation.valid) {
      const error = new Error('Invalid assignment');
      error.code = 'VALIDATION_ERROR';
      error.details = assignmentValidation.errors;
      throw error;
    }
        if (assignmentValidation.value.assignment_type === 'Department' && actor && actor.business_id && actor.role !== 'super_admin') {
      const [[dept]] = await db.query(
        'SELECT business_id FROM departments WHERE id = ?',
        [assignmentValidation.value.reference_id]
      );
      if (!dept || dept.business_id !== actor.business_id) {
        const error = new Error('Cannot assign tasks to departments outside your business scope');
        error.code = 'FORBIDDEN';
        throw error;
      }
    }
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
    parent_task_id: parent_task_id ?? null,
    client_id: client_id ?? null,
    client_business_id: client_business_id ?? null,
    business_id: business_id ?? null,
    created_by: actorId,
  });

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

  if (isAdmin) {
    const businessTaskIds = await getBusinessScopedTaskIdsForAdmin(actorId);
    if (!businessTaskIds.includes(id)) {
      const error = new Error('Access denied: task is outside your business scope');
      error.code = 'FORBIDDEN';
      throw error;
    }
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

  const assignments = Array.isArray(payload.assignments) ? payload.assignments : [];
  if (assignments.length > 0) {
    const currentAssignments = await taskAssignmentModel.findByTaskId(id);
    const currentMap = new Map(currentAssignments.map((a) => [`${a.assignment_type}:${a.reference_id}`, a]));
    const newMap = new Map(assignments.map((a) => [`${a.assignment_type}:${a.reference_id}`, a]));

    for (const [key, assignment] of currentMap) {
      if (!newMap.has(key)) {
        await taskAssignmentModel.removeByTaskAndRef(id, assignment.assignment_type, assignment.reference_id);
      }
    }

    for (const [key, assignment] of newMap) {
      if (!currentMap.has(key)) {
        const assignmentValidation = validateAssignmentPayload({ ...assignment, task_id: id });
        if (!assignmentValidation.valid) {
          const error = new Error('Invalid assignment in update payload');
          error.code = 'VALIDATION_ERROR';
          error.details = assignmentValidation.errors;
          throw error;
        }
        await taskAssignmentModel.create({
          task_id: id,
          assignment_type: assignmentValidation.value.assignment_type,
          reference_id: assignmentValidation.value.reference_id,
          assigned_by: actorId,
        });
      }
    }
  }

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

  if (isAdmin) {
    const businessTaskIds = await getBusinessScopedTaskIdsForAdmin(actorId);
    if (!businessTaskIds.includes(id)) {
      const error = new Error('Access denied: task is outside your business scope');
      error.code = 'FORBIDDEN';
      throw error;
    }
  }

  const parentTaskId = task.parent_task_id;
  await taskAssignmentModel.removeByTaskId(id);
  await taskCommentModel.removeByTaskId(id);
  await taskModel.remove(id);

  // Recompute the (former) parent's derived status now that a child is gone.
  if (parentTaskId != null) {
    const children = await taskModel.findByParentId(parentTaskId);
    const parent = await taskModel.findById(parentTaskId);
    if (parent && parent.status !== 'Cancelled') {
      const derived = deriveParentStatus(children);
      if (derived && derived !== parent.status) {
        await taskModel.update(parent.id, { status: derived });
      }
    }
  }

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

  if (isAdmin) {
    const businessTaskIds = await getBusinessScopedTaskIdsForAdmin(actorId);
    if (!businessTaskIds.includes(task.id)) {
      const error = new Error('Access denied: task is outside your business scope');
      error.code = 'FORBIDDEN';
      throw error;
    }
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

  if (isAdmin) {
    const businessTaskIds = await getBusinessScopedTaskIdsForAdmin(actorId);
    if (!businessTaskIds.includes(taskId)) {
      const error = new Error('Access denied: task is outside your business scope');
      error.code = 'FORBIDDEN';
      throw error;
    }
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

  // Block progress edits on finalized tasks. To change the progress rate the
  // user must first move the task out of Completed/Cancelled via its status.
  // Status-only changes (e.g. re-opening a Completed task) are still allowed.
  if (completion_rate !== undefined && (task.status === 'Completed' || task.status === 'Cancelled')) {
    const error = new Error('Update the Status Before editing the progress rate');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const autoStatus = computeAutoStatus(task.start_datetime, task.deadline_datetime, task.status);
  let finalStatus = status || autoStatus;

  // When no explicit status is supplied (i.e. a progress-rate edit), derive the
  // status from the progress: any recorded progress -> In Progress, 100% -> Completed.
  // An explicit status set via the status menu always wins and is preserved as-is.
  if (!status) {
    if (completion_rate >= 100) {
      finalStatus = 'Completed';
    } else if (completion_rate > 0) {
      finalStatus = 'In Progress';
    }
  }

  // Business rule: marking as Completed implies 100% completion rate
  if (finalStatus === 'Completed' && (!completion_rate || completion_rate < 100)) {
    completion_rate = 100;
  }

  let targetUserId = actorId;
  if (!isAssigned) {
    const assignments = await taskAssignmentModel.findByTaskId(task_id);
    const userAssignments = assignments.filter((a) => a.assignment_type === 'User');

    if (userAssignments.length > 0) {
      const userIds = userAssignments.map((a) => a.reference_id);
      const [progressRows] = await db.query(
        `SELECT user_id FROM task_progress WHERE task_id = ? AND user_id IN (?) ORDER BY updated_at DESC LIMIT 1`,
        [task_id, userIds]
      );

      targetUserId = progressRows.length > 0 ? progressRows[0].user_id : userAssignments[0].reference_id;
    }
  }

  await taskProgressModel.create({
    task_id,
    user_id: targetUserId,
    completion_rate: completion_rate ?? 0,
    status: finalStatus,
    notes,
  });

  await taskModel.update(task_id, { status: finalStatus });

  // Recompute the parent task's status from its children so the parent moves to
  // the correct status row and KPI stats stay consistent with this update.
  if (task.parent_task_id != null) {
    const children = await taskModel.findByParentId(task.parent_task_id);
    const parent = await taskModel.findById(task.parent_task_id);
    if (parent && parent.status !== 'Cancelled') {
      const derived = deriveParentStatus(children);
      if (derived && derived !== parent.status) {
        await taskModel.update(parent.id, { status: derived });
      }
    }
  }

  // When a parent task's status is explicitly changed, propagate it to its direct
  // children so they "respect the parent status" and the parent row stays consistent
  // with what the user selected.
  if (task.parent_task_id == null && status) {
    const children = await taskModel.findByParentId(task.id);
    for (const child of children) {
      if (child.status !== status) {
        await taskModel.update(child.id, { status });
      }
    }
  }

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

  const { task_id, comment, parent_id } = validation.value;

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

  if (parent_id) {
    const parent = await taskCommentModel.findById(parent_id);
    if (!parent || parent.task_id !== task_id) {
      const error = new Error('Parent comment not found');
      error.code = 'NOT_FOUND';
      throw error;
    }
  }

  const commentId = await taskCommentModel.create({
    task_id,
    user_id: actorId,
    comment,
    parent_id: parent_id || null,
  });

  logAudit('task.comment.create', actorId, { task_id, comment_id: commentId });

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
  return await listTasks(filters, userId);
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

async function getUser(userId) {
  const [rows] = await db.query(
    'SELECT id, role, business_id, department_id FROM users WHERE id = ?',
    [userId]
  );
  return rows[0] || null;
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
     WHERE (
       ta.assignment_type = 'User' AND ta.reference_id = ?
       OR ta.assignment_type = 'Department' AND ta.reference_id = ?
       OR ta.assignment_type = 'Position' AND ta.reference_id = ?
     )`,
     [userId, user.department_id, user.position_title]
  );

  return rows.map(r => r.task_id);
}

async function getBusinessScopedTaskIdsForAdmin(userId) {
  const [users] = await db.query(
    'SELECT business_id FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  const user = users[0];
  if (!user || !user.business_id) return [];

  const businessId = user.business_id;

  const [rows] = await db.query(
    `SELECT DISTINCT t.id AS task_id
     FROM tasks t
     LEFT JOIN users u ON t.created_by = u.id
     LEFT JOIN task_assignments ta ON ta.task_id = t.id
     WHERE (
       u.business_id = ?
       OR (
         ta.assignment_type = 'Department'
         AND ta.reference_id IN (
           SELECT d.id FROM departments d WHERE d.business_id = ?
         )
       )
     )`,
    [businessId, businessId]
  );

  return rows.map(r => r.task_id);
}

async function getMyTaskCount(userId) {
  const isAdmin = await isUserAdmin(userId);
  if (isAdmin) {
    const [userRows] = await db.query(
      'SELECT role, business_id FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    const user = userRows[0];

    if (user && user.role === 'admin' && user.business_id) {
      const [countRow] = await db.query(
        `SELECT COUNT(DISTINCT t.id) AS total
         FROM tasks t
         LEFT JOIN users u ON t.created_by = u.id
         LEFT JOIN task_assignments ta ON ta.task_id = t.id
         WHERE (u.business_id = ?
           OR (ta.assignment_type = 'Department'
             AND ta.reference_id IN (SELECT d.id FROM departments d WHERE d.business_id = ?)))`,
         [user.business_id, user.business_id]
      );
      return countRow[0]?.total ?? 0;
    }

    const [countRow] = await db.query(
        "SELECT COUNT(*) AS total FROM tasks"
    );
    return countRow[0]?.total ?? 0;
  }

  const [users] = await db.query('SELECT department_id, position_title FROM users WHERE id = ? LIMIT 1', [userId]);
  if (!users || users.length === 0) return 0;

  const user = users[0];
    const [countRow] = await db.query(
    `SELECT COUNT(DISTINCT ta.task_id) AS total
     FROM task_assignments ta
     WHERE (
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
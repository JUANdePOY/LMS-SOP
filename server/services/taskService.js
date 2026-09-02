const db = require('../config/database');
const taskModel = require('../models/taskModel');
const taskAssignmentModel = require('../models/taskAssignmentModel');
const taskProgressModel = require('../models/taskProgressModel');
const taskAttachmentModel = require('../models/taskAttachmentModel');
const { buildViewUrl } = require('../services/taskAttachmentPublicFile');
const taskCommentModel = require('../models/taskCommentModel');
const projectModel = require('../models/projectModel');
const { logAudit } = require('../utils/auditLogger');
const { computeAutoStatus, deriveParentStatus } = require('../utils/taskStatus');
const { validateTaskPayload, validateAssignmentPayload, validateProgressPayload, validateCommentPayload } = require('../validators/taskValidator');

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
    // Department Heads see only tasks assigned to their department.
    // Admins and super_admins see all tasks in their business scope.
    filters.task_ids = await getAdminScopedTaskIds(actorId);
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

async function enrichAssignmentRows(assignments) {
  return Promise.all(assignments.map(async (assignment) => {
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
}

// Build a nested tree of sub-tasks for a parent. Depth is bounded to avoid
// runaway recursion on malformed data (a cycle cannot happen because the FK is
// ON DELETE CASCADE and self-references are rejected by the validator, but we
// guard anyway). Each node is enriched with assignments + auto status so the
// client can render the tree without extra round-trips.
async function buildSubtree(parentId, depth = 0) {
  if (depth > 6) return [];
  const children = await taskModel.findByParentId(parentId);
  const nodes = [];
  for (const child of children) {
    const assignments = await taskAssignmentModel.findByTaskId(child.id);
    nodes.push({
      ...child,
      auto_status: computeAutoStatus(child.start_datetime, child.deadline_datetime, child.status),
      status: child.status,
      assignments: await enrichAssignmentRows(assignments),
      subtasks: await buildSubtree(child.id, depth + 1),
    });
  }
  return nodes;
}

async function getTask(id, actorId) {
  const task = await taskModel.findById(id);
  if (!task) {
    const error = new Error('Task not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const isAdmin = await isUserAdmin(actorId);
  if (!isAdmin) {
    const directlyAssigned = await isUserAssignedToTaskById(actorId, id);
    if (!directlyAssigned) {
      // Allow viewing any task that belongs to a project the user is assigned to,
      // so employees can see the progress of their peers on the project.
      // Also allow viewing any task in a business where the user has at least one
      // assignment, so employees can see all tasks in their business scope.
      const pid = task.project_id;
      const assignedProjectIds = await getAssignedProjectIdsForUser(actorId);
      if (pid != null && assignedProjectIds.map(String).includes(String(pid))) {
        // allowed via project
      } else {
        // Check if the user has any assignment in the same business as this task
        const actor = await getUser(actorId);
        const [bizCheck] = await db.query(
          `SELECT 1
           FROM tasks t
           INNER JOIN task_assignments ta ON ta.task_id = t.id
           WHERE t.client_business_id = ?
             AND t.client_business_id IS NOT NULL
             AND (
               (ta.assignment_type = 'User' AND ta.reference_id = ?)
               OR (ta.assignment_type = 'Department' AND ta.reference_id = ?)
               OR (ta.assignment_type = 'Position' AND ta.reference_id = ?)
             )
           LIMIT 1`,
          [task.client_business_id, actorId, actor?.department_id, actor?.position_title]
        );
        if (!bizCheck.length) {
          const error = new Error('You are not authorized to view this task');
          error.code = 'FORBIDDEN';
          throw error;
        }
      }
    }
  }

  if (isAdmin) {
    // Department Heads can only view tasks assigned to their department.
    // Admins and super_admins can view any task in their business scope.
    if (await isUserDepartmentHead(actorId)) {
      const deptTaskIds = await getDepartmentScopedTaskIdsForDeptHead(actorId);
      if (!deptTaskIds.includes(id)) {
        const error = new Error('Access denied: task is outside your department scope');
        error.code = 'FORBIDDEN';
        throw error;
      }
    } else {
      const businessTaskIds = await getAdminScopedTaskIds(actorId);
      if (!businessTaskIds.includes(id)) {
        const error = new Error('Access denied: task is outside your business scope');
        error.code = 'FORBIDDEN';
        throw error;
      }
    }
  }

  const assignments = await taskAssignmentModel.findByTaskId(id);
  const progress = await taskProgressModel.findByTaskId(id);
  const comments = await taskCommentModel.findByTaskId(id);
  const enrichedComments = await Promise.all(comments.map(async (c) => {
    const attachments = await taskAttachmentModel.findByCommentId(c.id);
    const enrichedAttachments = attachments.map((att) => ({
      ...att,
      view_url: buildViewUrl(att.id),
    }));
    return { ...c, attachments: enrichedAttachments };
  }));
  const taskAttachments = await taskAttachmentModel.findByTaskId(id);

  const enrichedAssignments = await enrichAssignmentRows(assignments);

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

  const customFields = await projectModel.getTaskCustomFields(id);

  const subtasks = await buildSubtree(id);

  return {
    ...task,
    auto_status: autoStatus,
    status: task.status,
    assignments: enrichedAssignments,
    progress: enrichedProgress,
    comments: enrichedComments,
    attachments: enrichedTaskAttachments,
    custom_fields: customFields,
    subtasks,
  };
}

async function createTask(payload, actorId) {
  // Projects have been removed from the table, so a task no longer needs a
  // client/business scope to be created — validate as a partial payload.
  const validation = validateTaskPayload(payload, false);
  if (!validation.valid) {
    const error = new Error('Validation failed');
    error.code = 'VALIDATION_ERROR';
    error.details = validation.errors;
    throw error;
  }

  const {
    title, description, priority, status, start_datetime, deadline_datetime,
    estimated_hours, category, parent_task_id, client_id, client_business_id, business_id, project_id
  } = validation.value;

  if (deadline_datetime && start_datetime && new Date(deadline_datetime) <= new Date(start_datetime)) {
    const error = new Error('Deadline must be after start date and time');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const actor = await getUser(actorId);
  const assignments = Array.isArray(payload.assignments) ? payload.assignments : [];
  // Tasks may be created unassigned; assignees can be added afterwards.
  // (Sub-tasks may also inherit their parent's context.)

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
    project_id: project_id ?? null,
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

  if (Array.isArray(payload.custom_fields) && payload.custom_fields.length > 0) {
    await projectModel.setTaskCustomFields(taskId, payload.custom_fields);
  }

  logAudit('task.create', actorId, { task_id: taskId, title });

  return await getTask(taskId, actorId);
}

async function duplicateTask(id, actorId) {
  const source = await taskModel.findById(id);
  if (!source) {
    const error = new Error('Task not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const isAdmin = await isUserAdmin(actorId);
  if (!isAdmin) {
    const error = new Error('You are not authorized to duplicate this task');
    error.code = 'FORBIDDEN';
    throw error;
  }

  // Copy the source task's assignments onto the duplicate.
  const [assignmentRows] = await db.query(
    'SELECT assignment_type, reference_id FROM task_assignments WHERE task_id = ?',
    [id]
  );

  const newId = await taskModel.create({
    title: `${source.title} (copy)`,
    description: source.description,
    priority: source.priority || 'Medium',
    status: source.status || 'Pending',
    start_datetime: source.start_datetime,
    deadline_datetime: source.deadline_datetime,
    estimated_hours: source.estimated_hours,
    category: source.category,
    parent_task_id: null,
    client_id: source.client_id ?? null,
    client_business_id: source.client_business_id ?? null,
    business_id: source.business_id ?? null,
    project_id: source.project_id ?? null,
    created_by: actorId,
  });

  for (const a of assignmentRows) {
    await taskAssignmentModel.create({
      task_id: newId,
      assignment_type: a.assignment_type,
      reference_id: a.reference_id,
      assigned_by: actorId,
    });
  }

  logAudit('task.duplicate', actorId, { task_id: newId, source_task_id: id, title: source.title });

  return await getTask(newId, actorId);
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
    const businessTaskIds = await getAdminScopedTaskIds(actorId);
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

  // When assignments are explicitly provided (including an empty array), treat
  // it as a full replace: sync the stored rows to exactly match the payload so
  // clearing all assignees actually removes them. Only skip when the key is
  // absent entirely (a normal field update that shouldn't touch assignments).
  const assignments = Array.isArray(payload.assignments) ? payload.assignments : null;
  if (assignments !== null) {
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
         // Enforce assignment scope on each new assignment.
         const scopeCheck = await validateAssignmentScope(
           actorId,
           assignmentValidation.value.assignment_type,
           assignmentValidation.value.reference_id
         );
         if (!scopeCheck.valid) {
           const error = new Error(scopeCheck.message);
           error.code = 'FORBIDDEN';
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

  if (Array.isArray(payload.custom_fields) && payload.custom_fields.length > 0) {
    await projectModel.setTaskCustomFields(id, payload.custom_fields);
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
    const businessTaskIds = await getAdminScopedTaskIds(actorId);
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
     const businessTaskIds = await getAdminScopedTaskIds(actorId);
     if (!businessTaskIds.includes(task.id)) {
       const error = new Error('Access denied: task is outside your business scope');
       error.code = 'FORBIDDEN';
       throw error;
     }
   }

   // Enforce assignment scope: department_head can only assign within their
   // department; admin can only assign within their business.
   const scopeCheck = await validateAssignmentScope(
     actorId,
     validation.value.assignment_type,
     validation.value.reference_id
   );
   if (!scopeCheck.valid) {
     const error = new Error(scopeCheck.message);
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

  if (isAdmin) {
    const businessTaskIds = await getAdminScopedTaskIds(actorId);
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
  const isAssigned = await isUserAssignedToTaskById(actorId, task_id);
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

async function addComment(payload, actorId, req) {
  const validation = validateCommentPayload(payload);
  if (!validation.valid) {
    const error = new Error('Validation failed');
    error.code = 'VALIDATION_ERROR';
    error.details = validation.errors;
    throw error;
  }

  const { task_id, comment, parent_id, mentions } = validation.value;
  const files = Array.isArray(payload.files) ? payload.files : [];

  if ((!comment || !comment.trim()) && files.length === 0) {
    const error = new Error('Comment or attachment is required');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const task = await taskModel.findById(task_id);
  if (!task) {
    const error = new Error('Task not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const isAdmin = await isUserAdmin(actorId);
  const isAssigned = await isUserAssignedToTaskById(actorId, task_id);
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
    comment: comment || '',
    parent_id: parent_id || null,
    mentions: mentions || [],
  });

  const attachments = [];
  for (const file of files) {
    const fileValidation = taskAttachmentModel.validateAttachment(file.mimetype, file.originalname);
    if (!fileValidation.valid) {
      const error = new Error(fileValidation.error);
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    const originalName = file.originalname || 'attachment';
    const fileSize = file.size || (file.buffer ? file.buffer.length : 0);

    const attachmentId = await taskAttachmentModel.create({
      task_progress_id: null,
      task_id,
      comment_id: commentId,
      file_name: originalName,
      original_name: originalName,
      mime_type: file.mimetype,
      size_bytes: fileSize,
      file_data: file.buffer || null,
      uploaded_by: actorId,
    });

    const attachment = await taskAttachmentModel.findById(attachmentId);
    attachments.push({ ...attachment, view_url: buildViewUrl(attachmentId, req) });
  }

  logAudit('task.comment.create', actorId, {
    task_id,
    comment_id: commentId,
    attachment_count: attachments.length,
    mention_count: (mentions || []).length,
  });

  const created = await taskCommentModel.findById(commentId);
  return { ...created, attachments };
}

async function uploadAttachment(taskId, file, actorId, req) {
  const task = await taskModel.findById(taskId);
  if (!task) {
    const error = new Error('Task not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const isAdmin = await isUserAdmin(actorId);
  const isAssigned = await isUserAssignedToTaskById(actorId, taskId);
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
  const isAssigned = await isUserAssignedToTaskById(actorId, attachment.task_id);
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

// Employee "My Tasks" hierarchy. Returns the full set of clients / businesses /
// projects the user is assigned to, plus every task inside those projects (so the
// employee can see the progress of their peers), shaped exactly like the admin
// Tasks page expects: { tasks, projectsById, clientTree }. The task rows are
// enriched with the same auto-status + progress + assignments as the admin list.
async function getMyTaskHierarchy(userId) {
  const user = await getUser(userId);
  if (!user) return { tasks: [], projectsById: {}, clientTree: [] };

  // Find all businesses where the user has at least one task assignment.
  // This drives which businesses the employee can see (all tasks in those
  // businesses, not just their own).
  const [bizRows] = await db.query(
    `SELECT DISTINCT t.client_business_id
     FROM tasks t
     INNER JOIN task_assignments ta ON ta.task_id = t.id
     WHERE t.client_business_id IS NOT NULL
       AND (
         (ta.assignment_type = 'User' AND ta.reference_id = ?)
         OR (ta.assignment_type = 'Department' AND ta.reference_id = ?)
         OR (ta.assignment_type = 'Position' AND ta.reference_id = ?)
       )`,
    [userId, user.department_id, user.position_title]
  );
  const businessIds = bizRows.map((r) => r.client_business_id);

  // Also find tasks assigned directly to the user (or via dept/position) that
  // have no client_business_id — these still belong in "My Tasks".
  const [directRows] = await db.query(
    `SELECT DISTINCT t.id AS task_id
     FROM tasks t
     INNER JOIN task_assignments ta ON ta.task_id = t.id
     WHERE t.client_business_id IS NULL
       AND (
         (ta.assignment_type = 'User' AND ta.reference_id = ?)
         OR (ta.assignment_type = 'Department' AND ta.reference_id = ?)
         OR (ta.assignment_type = 'Position' AND ta.reference_id = ?)
       )`,
    [userId, user.department_id, user.position_title]
  );
  const directTaskIds = directRows.map((r) => r.task_id);

  // Find all task IDs assigned to the user (for marking is_assigned flag)
  const [assignedRows] = await db.query(
    `SELECT DISTINCT ta.task_id
     FROM task_assignments ta
     WHERE (ta.assignment_type = 'User' AND ta.reference_id = ?)
        OR (ta.assignment_type = 'Department' AND ta.reference_id = ?)
        OR (ta.assignment_type = 'Position' AND ta.reference_id = ?)`,
    [userId, user.department_id, user.position_title]
  );
  const assignedTaskIds = new Set(assignedRows.map((r) => String(r.task_id)));

  if (!businessIds.length && !directTaskIds.length) {
    return { tasks: [], projectsById: {}, clientTree: [] };
  }

  // Fetch ALL tasks in the businesses where the user has assignments,
  // plus directly assigned tasks that have no business.
  let rows = [];
  if (businessIds.length) {
    const [bizTasks] = await db.query(
      `SELECT t.*, cl.client_name, cb.business_name AS client_business_name
       FROM tasks t
       LEFT JOIN clients cl ON t.client_id = cl.id
       LEFT JOIN client_businesses cb ON t.client_business_id = cb.id
       WHERE t.client_business_id IN (?)`,
      [businessIds]
    );
    rows = bizTasks;
  }
  if (directTaskIds.length) {
    const [directTasks] = await db.query(
      `SELECT t.*, cl.client_name, cb.business_name AS client_business_name
       FROM tasks t
       LEFT JOIN clients cl ON t.client_id = cl.id
       LEFT JOIN client_businesses cb ON t.client_business_id = cb.id
       WHERE t.id IN (?)`,
      [directTaskIds]
    );
    // Merge, avoiding duplicates
    const existingIds = new Set(rows.map((r) => r.id));
    for (const t of directTasks) {
      if (!existingIds.has(t.id)) rows.push(t);
    }
  }

  const taskIds = rows.map((task) => task.id);

  // Progress (latest per task) + assignments, mirroring listTasks enrichment.
  let progressMap = {};
  const assignmentsMap = {};
  if (taskIds.length > 0) {
    const [progressRows] = await db.query(
      `SELECT tp.task_id, tp.completion_rate
       FROM task_progress tp
       INNER JOIN (
         SELECT task_id, MAX(updated_at) AS max_updated
         FROM task_progress WHERE task_id IN (?) GROUP BY task_id
       ) latest ON tp.task_id = latest.task_id AND tp.updated_at = latest.max_updated`,
      [taskIds]
    );
    progressRows.forEach((p) => { progressMap[p.task_id] = p.completion_rate; });

    const [assignmentRows] = await db.query(
      `SELECT ta.task_id, ta.assignment_type, ta.reference_id, ta.assigned_at
       FROM task_assignments ta WHERE ta.task_id IN (?) ORDER BY ta.assigned_at ASC`,
      [taskIds]
    );

    const userIds = [...new Set(assignmentRows.filter((a) => a.assignment_type === 'User').map((a) => Number(a.reference_id)).filter(Boolean))];
    const deptIds = [...new Set(assignmentRows.filter((a) => a.assignment_type === 'Department').map((a) => Number(a.reference_id)).filter(Boolean))];

    const userMap = {};
    if (userIds.length > 0) {
      const [users] = await db.query('SELECT id, full_name FROM users WHERE id IN (?)', [userIds]);
      users.forEach((u) => { userMap[u.id] = u.full_name; });
    }
    const userAvatarMap = {};
    if (userIds.length > 0) {
      const [usersWithAvatar] = await db.query('SELECT id, avatar_url FROM users WHERE id IN (?)', [userIds]);
      usersWithAvatar.forEach((u) => { userAvatarMap[u.id] = u.avatar_url; });
    }
    const deptMap = {};
    if (deptIds.length > 0) {
      const [depts] = await db.query('SELECT id, name FROM departments WHERE id IN (?)', [deptIds]);
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

  const tasks = rows.map((task) => ({
    ...task,
    status: computeAutoStatus(task.start_datetime, task.deadline_datetime, task.status),
    progress_rate: progressMap[task.id] ?? null,
    assignments: assignmentsMap[task.id] || [],
    is_assigned: assignedTaskIds.has(String(task.id)),
  }));

  // Build projectsById + clientTree from business linkage. Include ALL
  // projects in the businesses where the user has tasks, and ALL businesses
  // in those clients, so the hierarchy shows the full business context.
  const projectClientMap = {}; // projectId -> { client_id, client_name, client_business_id, client_business_name }
  let projRows = [];
  if (businessIds.length > 0) {
    const [rows] = await db.query(
      `SELECT p.id, p.name, p.client_business_id,
              cb.client_id, cb.business_name AS client_business_name,
              c.client_name, c.color AS client_color
       FROM projects p
       LEFT JOIN client_businesses cb ON p.client_business_id = cb.id
       LEFT JOIN clients c ON cb.client_id = c.id
       WHERE p.client_business_id IN (?)`,
      [businessIds]
    );
    projRows = rows;
  }

  const projectsById = {};
  const clientsMap = new Map();
  for (const p of projRows) {
    projectsById[String(p.id)] = {
      id: p.id,
      name: p.name,
      client_id: p.client_id,
      client_name: p.client_name,
      client_business_id: p.client_business_id,
      client_business_name: p.client_business_name,
    };
    // Record each project's client/business so tasks can inherit it.
    if (p.client_id != null && p.client_business_id != null) {
      projectClientMap[String(p.id)] = {
        client_id: p.client_id,
        client_name: p.client_name,
        client_business_id: p.client_business_id,
        client_business_name: p.client_business_name,
      };
    }
    if (p.client_id == null) continue;
    if (!clientsMap.has(p.client_id)) {
      clientsMap.set(p.client_id, {
        id: p.client_id,
        client_name: p.client_name,
        color: p.client_color || null,
        businesses: new Map(),
      });
    }
    const client = clientsMap.get(p.client_id);
    if (!client.businesses.has(p.client_business_id)) {
      client.businesses.set(p.client_business_id, { id: p.client_business_id, business_name: p.client_business_name });
    }
  }

  // Seed the clientTree with ONLY the businesses where the user has task
  // assignments — not every business in the client. Employees see only the
  // business units they are assigned to. Businesses with projects are already
  // seeded above from projRows; this covers businesses with tasks but no
  // projects (so they still appear in the tree).
  if (businessIds.length > 0) {
    const [taskBizRows] = await db.query(
      `SELECT cb.id AS business_id, cb.business_name, cb.client_id,
              c.client_name, c.color AS client_color
       FROM client_businesses cb
       LEFT JOIN clients c ON cb.client_id = c.id
       WHERE cb.id IN (?)`,
      [businessIds]
    );
    for (const b of taskBizRows) {
      if (b.client_id == null) continue;
      if (!clientsMap.has(b.client_id)) {
        clientsMap.set(b.client_id, {
          id: b.client_id,
          client_name: b.client_name,
          color: b.client_color || null,
          businesses: new Map(),
        });
      }
      const client = clientsMap.get(b.client_id);
      if (!client.businesses.has(b.business_id)) {
        client.businesses.set(b.business_id, { id: b.business_id, business_name: b.business_name });
      }
    }
  }

  // Enrich tasks that have a project but no client/business of their own.
  // This ensures the hierarchy table groups them under the correct client
  // instead of dropping them into "Unassigned". Handles both fully NULL
  // (client_id and client_business_id both missing) and partially NULL
  // (client_id set but client_business_id missing) cases.
  for (const task of tasks) {
    const needsClient = task.client_id == null;
    const needsBusiness = task.client_business_id == null;
    if (!needsClient && !needsBusiness) continue;
    const proj = task.project_id != null ? projectClientMap[String(task.project_id)] : null;
    if (proj) {
      if (needsClient) {
        task.client_id = proj.client_id;
        task.client_name = proj.client_name;
      }
      if (needsBusiness) {
        task.client_business_id = proj.client_business_id;
        task.client_business_name = proj.client_business_name;
      }
    }
  }

  // Also seed the client/business hierarchy from directly assigned tasks
  // (those without a project) so they appear in the tree.
  const directClientRows = rows.filter((t) => t.project_id == null && t.client_id != null);
  for (const t of directClientRows) {
    const clientId = Number(t.client_id);
    if (!clientsMap.has(clientId)) {
      clientsMap.set(clientId, {
        id: clientId,
        client_name: t.client_name || 'Unassigned Client',
        color: t.client_color || null,
        businesses: new Map(),
      });
    }
    const client = clientsMap.get(clientId);
    const bizId = t.client_business_id != null ? Number(t.client_business_id) : 'unassigned-business';
    const bizName = t.client_business_name || 'Unassigned Business';
    if (!client.businesses.has(bizId)) {
      client.businesses.set(bizId, { id: bizId, business_name: bizName });
    }
  }

  const clientTree = Array.from(clientsMap.values()).map((c) => ({
    id: c.id,
    client_name: c.client_name,
    color: c.color,
    businesses: Array.from(c.businesses.values()),
  }));

  return { tasks, projectsById, clientTree };
}

async function getTaskStats(filters = {}, actorId) {
  const isAdmin = await isUserAdmin(actorId);
  if (!isAdmin) {
    filters.task_ids = await getAssignedTaskIdsForUser(actorId);
  } else {
    filters.task_ids = await getAdminScopedTaskIds(actorId);
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

// Validates that an actor (assigner) is allowed to assign the given
// assignment_type + reference_id target. Enforces department-level isolation
// for department_head and business-level isolation for admin.
// Returns { valid: true } or { valid: false, message: '...' }.
async function validateAssignmentScope(actorId, assignmentType, referenceId) {
  const [actors] = await db.query(
    'SELECT id, role, business_id, department_id FROM users WHERE id = ? LIMIT 1',
    [actorId]
  );
  const actor = actors[0];
  if (!actor) return { valid: false, message: 'Actor not found' };

  // super_admin: unrestricted
  if (actor.role === 'super_admin') return { valid: true };

  if (assignmentType === 'Department') {
    const [depts] = await db.query(
      'SELECT id, business_id FROM departments WHERE id = ? LIMIT 1',
      [referenceId]
    );
    const dept = depts[0];
    if (!dept) return { valid: false, message: 'Department not found' };

    if (actor.role === 'admin') {
      if (dept.business_id !== actor.business_id) {
        return { valid: false, message: 'Cannot assign a department outside your business' };
      }
      return { valid: true };
    }
    if (actor.role === 'department_head') {
      if (String(dept.id) !== String(actor.department_id)) {
        return { valid: false, message: 'You can only assign your own department' };
      }
      return { valid: true };
    }
    return { valid: false, message: 'Your role cannot assign departments' };
  }

  if (assignmentType === 'User') {
    const [targets] = await db.query(
      'SELECT id, business_id, department_id FROM users WHERE id = ? LIMIT 1',
      [referenceId]
    );
    const target = targets[0];
    if (!target) return { valid: false, message: 'User not found' };

    if (actor.role === 'admin') {
      if (target.business_id !== actor.business_id) {
        return { valid: false, message: 'Cannot assign a user outside your business' };
      }
      return { valid: true };
    }
    if (actor.role === 'department_head') {
      if (String(target.department_id) !== String(actor.department_id)) {
        return { valid: false, message: 'You can only assign users within your department' };
      }
      return { valid: true };
    }
    return { valid: false, message: 'Your role cannot assign users' };
  }

  // Position type: only admins can assign by position
  if (assignmentType === 'Position') {
    if (actor.role === 'admin') return { valid: true };
    return { valid: false, message: 'Only admins can assign by position' };
  }

  return { valid: false, message: 'Unknown assignment type' };
}

async function getUser(userId) {
  const [rows] = await db.query(
    'SELECT id, role, business_id, department_id FROM users WHERE id = ?',
    [userId]
  );
  return rows[0] || null;
}

async function isUserDepartmentHead(userId) {
  const [users] = await db.query(
    'SELECT role FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  const user = users[0];
  return user && user.role === 'department_head';
}

// Returns the set of task IDs an admin-role user is allowed to access.
// Department Heads get department-scoped IDs; admins/super_admins get
// business-scoped IDs. Used by every mutating operation to enforce scope.
async function getAdminScopedTaskIds(actorId) {
  if (await isUserDepartmentHead(actorId)) {
    return await getDepartmentScopedTaskIdsForDeptHead(actorId);
  }
  return await getBusinessScopedTaskIdsForAdmin(actorId);
}

async function isUserAssignedToTaskById(userId, taskId) {
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

// Distinct project ids the user is attached to (via any of their assigned tasks).
// Used to scope the employee "My Tasks" hierarchy so they only see the clients /
// businesses / projects they actually work on, while still seeing every task
// (including peers') within those projects.
async function getAssignedProjectIdsForUser(userId) {
  const user = await getUser(userId);
  if (!user) return [];
  const [rows] = await db.query(
    `SELECT DISTINCT t.project_id
     FROM tasks t
     INNER JOIN task_assignments ta ON ta.task_id = t.id
     WHERE t.project_id IS NOT NULL
       AND (
         (ta.assignment_type = 'User' AND ta.reference_id = ?)
         OR (ta.assignment_type = 'Department' AND ta.reference_id = ?)
         OR (ta.assignment_type = 'Position' AND ta.reference_id = ?)
       )`,
    [userId, user.department_id, user.position_title]
  );
  return rows.map((r) => r.project_id);
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

// Returns task IDs scoped to a Department Head's department. Includes tasks
// that are:
//   - assigned directly to the department, OR
//   - assigned to a user who belongs to the department
// This ensures Department Heads see every task touching their department.
async function getDepartmentScopedTaskIdsForDeptHead(userId) {
  const [users] = await db.query(
    'SELECT department_id, business_id FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  const user = users[0];
  if (!user || !user.department_id) return [];

  const deptId = user.department_id;

  const [rows] = await db.query(
    `SELECT DISTINCT t.id AS task_id
     FROM tasks t
     LEFT JOIN task_assignments ta ON ta.task_id = t.id
     LEFT JOIN clients c ON t.client_id = c.id
     WHERE (
       (ta.assignment_type = 'Department' AND ta.reference_id = ?)
       OR (
         ta.assignment_type = 'User'
         AND ta.reference_id IN (
           SELECT u.id FROM users u WHERE u.department_id = ?
         )
       )
       OR (c.department_id = ?)
     )`,
    [deptId, deptId, deptId]
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

async function batchUpdateTasks(ids, changes, actorId) {
  const isAdmin = await isUserAdmin(actorId);
  if (!isAdmin) {
    const error = new Error('Only admins can update tasks in bulk');
    error.code = 'FORBIDDEN';
    throw error;
  }

  const businessTaskIds = await getAdminScopedTaskIds(actorId);
  const scoped = new Set(businessTaskIds);
  for (const id of ids) {
    if (!scoped.has(id)) {
      const error = new Error('Access denied: one or more tasks are outside your business scope');
      error.code = 'FORBIDDEN';
      throw error;
    }
  }

  const updatableCols = ['status', 'priority', 'project_id', 'client_id', 'client_business_id', 'business_id'];
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (const id of ids) {
      const sets = [];
      const params = [];
      for (const key of updatableCols) {
        if (changes[key] !== undefined) {
          sets.push(`${key} = ?`);
          params.push(changes[key]);
        }
      }
      if (sets.length > 0) {
        params.push(id);
        await conn.query(
          `UPDATE tasks SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          params
        );
      }
      if (Array.isArray(changes.assignments)) {
        await conn.query('DELETE FROM task_assignments WHERE task_id = ?', [id]);
        for (const a of changes.assignments) {
          await conn.query(
            'INSERT INTO task_assignments (task_id, assignment_type, reference_id, assigned_by) VALUES (?, ?, ?, ?)',
            [id, a.assignment_type, a.reference_id, actorId]
          );
        }
      }
      logAudit('task.update', actorId, { task_id: id, changes, batch: true });
    }
    await conn.commit();
    return { updated: ids.length };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    if (conn && typeof conn.release === 'function') conn.release();
  }
}

async function batchDeleteTasks(ids, actorId) {
  const isAdmin = await isUserAdmin(actorId);
  if (!isAdmin) {
    const error = new Error('Only admins can delete tasks in bulk');
    error.code = 'FORBIDDEN';
    throw error;
  }

  const businessTaskIds = await getAdminScopedTaskIds(actorId);
  const scoped = new Set(businessTaskIds);
  for (const id of ids) {
    if (!scoped.has(id)) {
      const error = new Error('Access denied: one or more tasks are outside your business scope');
      error.code = 'FORBIDDEN';
      throw error;
    }
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT id, parent_task_id FROM tasks WHERE id IN (?)', [ids]);
    const parentIds = [...new Set(rows.map((r) => r.parent_task_id).filter(Boolean))];

    for (const id of ids) {
      await conn.query('DELETE FROM tasks WHERE id = ?', [id]);
      logAudit('task.delete', actorId, { task_id: id, batch: true });
    }

    // Recompute the derived status of any (non-cancelled) parent whose children
    // changed as a result of the deletes, so the parent row stays consistent.
    for (const pid of parentIds) {
      const [children] = await conn.query('SELECT id, status FROM tasks WHERE parent_task_id = ?', [pid]);
      const [parentRows] = await conn.query('SELECT id, status FROM tasks WHERE id = ?', [pid]);
      const parent = parentRows[0];
      if (parent && parent.status !== 'Cancelled' && children.length > 0) {
        const derived = deriveParentStatus(children.map((c) => c.status));
        if (derived && derived !== parent.status) {
          await conn.query('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [derived, pid]);
        }
      }
    }

    await conn.commit();
    return { deleted: ids.length };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    if (conn && typeof conn.release === 'function') conn.release();
  }
}

module.exports = {
  computeAutoStatus,
  listTasks,
  getTask,
  createTask,
  duplicateTask,
  updateTask,
  deleteTask,
  assignTask,
  unassignTask,
  updateProgress,
  addComment,
  uploadAttachment,
  deleteAttachment,
  getMyTasks,
  getMyTaskHierarchy,
  getMyTaskCount,
  getTaskStats,
  batchUpdateTasks,
  batchDeleteTasks,
  isUserAssignedToTask,
};

// Returns true when the given user is allowed to interact with a task's progress,
// attachments, and comments. Admins (super_admin/admin/department_head) are
// always allowed; otherwise the user must be assigned to the task — directly, or
// via a department/position assignment that resolves to them.
const ADMIN_ROLES = ['super_admin', 'admin', 'department_head'];
async function isUserAssignedToTask(taskId, user) {
  if (!user) return false;
  if (ADMIN_ROLES.includes(user.role)) return true;
  const [rows] = await db.query(
    `SELECT assignment_type, reference_id FROM task_assignments WHERE task_id = ?`,
    [taskId]
  );
  return rows.some((a) => {
    if (a.assignment_type === 'User') return String(a.reference_id) === String(user.id);
    if (a.assignment_type === 'Department') {
      return user.department_id != null && String(a.reference_id) === String(user.department_id);
    }
    if (a.assignment_type === 'Position') {
      return Boolean(a.reference_id) && a.reference_id === user.position_title;
    }
    return false;
  });
}

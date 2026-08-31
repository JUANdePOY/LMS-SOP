const taskService = require('../services/taskService');
const taskModel = require('../models/taskModel');
const { validateFilters, validateBatchIds, validateBatchUpdatePayload } = require('../validators/taskValidator');
const taskNotifications = require('../services/taskNotificationService');

function handleError(res, error) {
  const code = error.code || 'INTERNAL_ERROR';
  const status =
    code === 'NOT_FOUND' ? 404 :
    code === 'VALIDATION_ERROR' ? 400 :
    code === 'FORBIDDEN' ? 403 :
    code === 'DUPLICATE_ASSIGNMENT' ? 409 :
    500;

  if (status === 500) console.error('[TaskController Error]', error);
  return res.status(status).json({ success: false, message: error.message, code });
}

const taskController = {
  async listTasks(req, res) {
    try {
      const { status, priority, category, search, page, limit } = req.query;
      const validation = validateFilters(req.query);
      const filters = validation.value;

      const result = await taskService.listTasks(filters, req.user.id);
      res.json({
        success: true,
        data: {
          rows: result.rows,
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
        message: 'Tasks retrieved successfully',
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  async getTask(req, res) {
    try {
      const taskId = parseInt(req.params.id, 10);
      const task = await taskService.getTask(taskId, req.user.id);
      res.json({ success: true, data: task, message: 'Task retrieved successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async createTask(req, res) {
    try {
      const task = await taskService.createTask(req.body, req.user.id);
      // Only notify the employees actually assigned to this task (with push),
      // not every employee in the system.
      taskNotifications.notifyTaskAssigned(task, { push: true }).catch(() => {});
      res.status(201).json({ success: true, data: task, message: 'Task created successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async updateTask(req, res) {
    try {
      const taskId = parseInt(req.params.id, 10);
      // Capture the assignment set before the update so we can detect which
      // employees were newly assigned (and notify only those).
      const before = Array.isArray(req.body.assignments)
        ? await taskService.getTask(taskId, req.user.id).catch(() => null)
        : null;
      const beforeKeys = before
        ? (before.assignments || []).map((a) => `${a.assignment_type}:${a.reference_id}`)
        : [];

      const task = await taskService.updateTask(taskId, req.body, req.user.id);

      // Notify only employees newly added as assignees. Field-only edits (title,
      // dates, status, …) must not push-notify employees.
      if (Array.isArray(req.body.assignments)) {
        taskNotifications.notifyNewAssignments(taskId, beforeKeys).catch(() => {});
      }

      res.json({ success: true, data: task, message: 'Task updated successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async deleteTask(req, res) {
    try {
      const taskId = parseInt(req.params.id, 10);
      await taskService.deleteTask(taskId, req.user.id);
      res.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async duplicateTask(req, res) {
    try {
      const taskId = parseInt(req.params.id, 10);
      const task = await taskService.duplicateTask(taskId, req.user.id);
      // A duplicated task is a new task: notify only its assigned employees (push).
      taskNotifications.notifyTaskAssigned(task, { push: true }).catch(() => {});
      res.status(201).json({ success: true, data: task, message: 'Task duplicated successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async assignTask(req, res) {
    try {
      const assignment = await taskService.assignTask(req.body, req.user.id);
      // Notify only the newly-assigned employee(s) — with push for non-admins.
      taskNotifications.notifyAssignmentAdded(assignment.task_id, assignment).catch(() => {});
      res.status(201).json({ success: true, data: assignment, message: 'Task assigned successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async unassignTask(req, res) {
    try {
      const { taskId, assignmentType, referenceId } = req.params;
      await taskService.unassignTask(
        parseInt(taskId, 10),
        assignmentType,
        referenceId,
        req.user.id
      );
      res.json({ success: true, message: 'Task unassigned successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async updateProgress(req, res) {
    try {
      const taskId = parseInt(req.body.task_id, 10);
      if (!Number.isFinite(taskId) || taskId <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid task ID', code: 'VALIDATION_ERROR' });
      }
      // Only assignees (or admins) may update a task's progress.
      const allowed = await taskService.isUserAssignedToTask(taskId, req.user).catch(() => false);
      if (!allowed) {
        return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'You are not assigned to this task' });
      }
      const before = Number.isFinite(taskId)
        ? await taskService.getTask(taskId, req.user.id).catch(() => null)
        : null;
      const progress = await taskService.updateProgress(req.body, req.user.id);
      const after = Number.isFinite(taskId)
        ? await taskService.getTask(taskId, req.user.id).catch(() => null)
        : null;

      // Admins are pushed only when a task is marked done or becomes overdue.
      if (after) {
        if (after.status === 'Completed' && before && before.status !== 'Completed') {
          taskNotifications.notifyAdminsTaskStatus(after, 'Completed').catch(() => {});
        } else if (after.status === 'Overdue' && before && before.status !== 'Overdue') {
          taskNotifications.notifyAdminsTaskStatus(after, 'Overdue').catch(() => {});
        }
      }

      res.json({ success: true, data: progress, message: 'Progress updated successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async addComment(req, res) {
    try {
      const payload = { task_id: req.params.taskId, ...req.body };
      const taskId = parseInt(req.params.taskId, 10);
      // Only assignees (or admins) may comment on a task.
      const allowed = await taskService.isUserAssignedToTask(taskId, req.user).catch(() => false);
      if (!allowed) {
        return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'You are not assigned to this task' });
      }
      if (req.body.mentions) {
        try {
          // Mentions may arrive as a JSON string (multipart/form-data, when a
          // file is attached) or as an already-parsed array (JSON body, no file).
          payload.mentions =
            typeof req.body.mentions === 'string'
              ? JSON.parse(req.body.mentions)
              : Array.isArray(req.body.mentions)
                ? req.body.mentions
                : [];
        } catch {
          payload.mentions = [];
        }
      }
      payload.files = req.files || [];
      const comment = await taskService.addComment(payload, req.user.id, req);
      // Notify only the explicitly mentioned employees (in-app + push).
      const mentionedIds = Array.isArray(payload.mentions)
        ? payload.mentions.map((m) => m && m.id).filter(Boolean)
        : [];
      if (mentionedIds.length > 0) {
        // Use a plain lookup (no scope/auth guards) so the notification is sent
        // even when the acting admin's business scope doesn't cover the task —
        // the comment was already posted, so the mention must still notify.
        const task = await taskModel.findById(req.params.taskId).catch(() => null);
        taskNotifications.notifyMentioned(task, mentionedIds, req.user.id).catch(() => {});
      }
      res.status(201).json({ success: true, data: comment, message: 'Comment added successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async listComments(req, res) {
    try {
      const taskId = parseInt(req.params.taskId, 10);
      const task = await taskService.getTask(taskId, req.user.id);
      const comments = task.comments || [];
      res.json({ success: true, data: comments, message: 'Comments retrieved successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async uploadAttachment(req, res) {
    try {
      const taskId = parseInt(req.params.taskId, 10);
      if (!Number.isFinite(taskId) || taskId <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid task ID', code: 'VALIDATION_ERROR' });
      }
      // Only assignees (or admins) may attach files to a task.
      const allowed = await taskService.isUserAssignedToTask(taskId, req.user).catch(() => false);
      if (!allowed) {
        return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'You are not assigned to this task' });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'File is required', code: 'VALIDATION_ERROR' });
      }
      const attachment = await taskService.uploadAttachment(taskId, req.file, req.user.id, req);
      res.status(201).json({ success: true, data: attachment, message: 'Attachment uploaded successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async deleteAttachment(req, res) {
    try {
      const attachmentId = parseInt(req.params.attachmentId, 10);
      if (!Number.isFinite(attachmentId) || attachmentId <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid attachment ID', code: 'VALIDATION_ERROR' });
      }
      await taskService.deleteAttachment(attachmentId, req.user.id);
      res.json({ success: true, message: 'Attachment deleted successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async getMyTasks(req, res) {
    try {
      const { status, page, limit } = req.query;
      const validation = validateFilters(req.query);
      const filters = validation.value;

      const result = await taskService.getMyTasks(req.user.id, filters);
      res.json({
        success: true,
        data: {
          rows: result.rows,
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
        message: 'My tasks retrieved successfully',
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  async getStats(req, res) {
    try {
      const stats = await taskService.getTaskStats({}, req.user.id);
      res.json({ success: true, data: stats, message: 'Task stats retrieved successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async getMyTaskHierarchy(req, res) {
    try {
      const data = await taskService.getMyTaskHierarchy(req.user.id);
      res.json({
        success: true,
        data,
        message: 'My task hierarchy retrieved successfully',
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  async getMyTaskCount(req, res) {
    try {
      const count = await taskService.getMyTaskCount(req.user.id);
      res.json({ success: true, data: { count }, message: 'Task count retrieved successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async batchUpdateTasks(req, res) {
    try {
      const validation = validateBatchUpdatePayload(req.body);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.errors.join('; '),
          code: 'VALIDATION_ERROR',
          errors: validation.errors,
        });
      }

      const result = await taskService.batchUpdateTasks(
        validation.value.ids,
        validation.value.changes,
        req.user.id
      );
      res.json({ success: true, data: result, message: 'Tasks updated successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async batchDeleteTasks(req, res) {
    try {
      const validation = validateBatchIds(req.body);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.errors.join('; '),
          code: 'VALIDATION_ERROR',
          errors: validation.errors,
        });
      }

      const result = await taskService.batchDeleteTasks(validation.value.ids, req.user.id);
      res.json({ success: true, data: result, message: 'Tasks deleted successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },
};

module.exports = { taskController, handleError };

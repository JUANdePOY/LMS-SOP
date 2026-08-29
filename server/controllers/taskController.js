const taskService = require('../services/taskService');
const { validateFilters } = require('../validators/taskValidator');
const { broadcastSystemChange } = require('../services/notificationService');

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
      broadcastSystemChange({
        title: 'New Task Created',
        body: task.title,
        type: 'info',
        link: `/tasks/${task.id}`,
        entityType: 'task',
        entityId: task.id,
      }).catch(() => {});
      res.status(201).json({ success: true, data: task, message: 'Task created successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async updateTask(req, res) {
    try {
      const taskId = parseInt(req.params.id, 10);
      const task = await taskService.updateTask(taskId, req.body, req.user.id);
      broadcastSystemChange({
        title: 'Task Updated',
        body: task.title,
        type: 'info',
        link: `/tasks/${task.id}`,
        entityType: 'task',
        entityId: task.id,
      }).catch(() => {});
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
      broadcastSystemChange({
        title: 'Task Duplicated',
        body: task.title,
        type: 'info',
        link: `/tasks/${task.id}`,
        entityType: 'task',
        entityId: task.id,
      }).catch(() => {});
      res.status(201).json({ success: true, data: task, message: 'Task duplicated successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async assignTask(req, res) {
    try {
      const assignment = await taskService.assignTask(req.body, req.user.id);
      broadcastSystemChange({
        title: 'Task Assigned',
        body: assignment.title || 'A task has been assigned',
        type: 'info',
        link: `/tasks/${assignment.task_id || assignment.id}`,
        entityType: 'task',
        entityId: assignment.task_id || assignment.id,
      }).catch(() => {});
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
      const progress = await taskService.updateProgress(req.body, req.user.id);
      res.json({ success: true, data: progress, message: 'Progress updated successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async addComment(req, res) {
    try {
      const payload = { task_id: req.params.taskId, ...req.body };
      const comment = await taskService.addComment(payload, req.user.id);
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

  async getMyTaskCount(req, res) {
    try {
      const count = await taskService.getMyTaskCount(req.user.id);
      res.json({ success: true, data: { count }, message: 'Task count retrieved successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },
};

module.exports = { taskController, handleError };

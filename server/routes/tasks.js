const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const { requirePermissionAction } = require('../middleware/scope');
const { taskController } = require('../controllers/taskController');
const { taskAttachmentModel } = require('../models/taskAttachmentModel');
const { getMaxUploadBytes, safeExtFromOriginal } = require('../config/uploads');

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/zip',
  'application/x-zip-compressed',
]);

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.docx', '.doc', '.xlsx', '.xls', '.zip']);

function taskAttachmentUploadMiddleware(req, res, next) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: getMaxUploadBytes() },
    fileFilter(req, file, cb) {
      const ext = safeExtFromOriginal(file.originalname);
      const mimeOk = file.mimetype && ALLOWED_MIME.has(String(file.mimetype).toLowerCase());
      const extOk = ALLOWED_EXT.has(ext);
      if (!mimeOk && !extOk) {
        return cb(new Error('Invalid file type. Allowed: images, PDF, Word, Excel, ZIP.'), false);
      }
      if (!extOk) {
        return cb(new Error('Invalid file extension'), false);
      }
      cb(null, true);
    },
  }).single('file');

  upload(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File too large' : err.message || 'Upload failed';
      return res.status(400).json({ success: false, message: msg, code: 'VALIDATION_ERROR' });
    }
    next();
  });
}

// Allows up to 5 inline attachments on a comment. A comment with no file is
// still valid (the field is simply absent), so multer must not reject it.
function commentUploadMiddleware(req, res, next) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: getMaxUploadBytes(), files: 5 },
    fileFilter(req, file, cb) {
      const ext = safeExtFromOriginal(file.originalname);
      const mimeOk = file.mimetype && ALLOWED_MIME.has(String(file.mimetype).toLowerCase());
      const extOk = ALLOWED_EXT.has(ext);
      if (!mimeOk && !extOk) {
        return cb(new Error('Invalid file type. Allowed: images, PDF, Word, Excel, ZIP.'), false);
      }
      if (!extOk) {
        return cb(new Error('Invalid file extension'), false);
      }
      cb(null, true);
    },
  }).array('files', 5);

  upload(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File too large'
        : err.code === 'LIMIT_FILE_COUNT' ? 'Too many files (max 5)'
        : err.message || 'Upload failed';
      return res.status(400).json({ success: false, message: msg, code: 'VALIDATION_ERROR' });
    }
    next();
  });
}

const router = express.Router();

// Admin: list all tasks
router.get('/', authenticateToken, requirePermissionAction('manage_tasks', 'view'), taskController.listTasks);

// Admin: create task
router.post('/', authenticateToken, taskController.createTask);

// Admin: assign task
router.post('/assign', authenticateToken, requirePermissionAction('manage_tasks', 'assign'), taskController.assignTask);

// User/Admin: update progress
router.post('/progress', authenticateToken, taskController.updateProgress);

// Admin: bulk update tasks (status / priority / assignments / etc.)
router.post('/batch', authenticateToken, requirePermissionAction('manage_tasks', 'edit'), taskController.batchUpdateTasks);

// Admin: bulk delete tasks
router.post('/batch/delete', authenticateToken, requirePermissionAction('manage_tasks', 'delete'), taskController.batchDeleteTasks);

function bulkUploadMiddleware(req, res, next) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter(req, file, cb) {
      const ext = safeExtFromOriginal(file.originalname);
      const mime = String(file.mimetype || '').toLowerCase();
      const allowedMimes = new Set([
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/json',
      ]);
      const allowedExts = new Set(['.csv', '.xlsx', '.xls', '.json']);
      if (!allowedMimes.has(mime) && !allowedExts.has(ext)) {
        return cb(new Error('Invalid file type. Allowed: CSV, XLSX, JSON.'), false);
      }
      cb(null, true);
    },
  }).single('file');

  upload(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 25 MB)' : err.message || 'Upload failed';
      return res.status(400).json({ success: false, message: msg, code: 'VALIDATION_ERROR' });
    }
    next();
  });
}

// Admin: bulk upload tasks
router.post('/bulk-upload', authenticateToken, requirePermissionAction('manage_tasks', 'create'), bulkUploadMiddleware, taskController.bulkUploadTasks);

// User: my tasks
router.get('/my', authenticateToken, taskController.getMyTasks);

// User: my task hierarchy (clients/businesses/projects + all tasks in assigned projects)
router.get('/my/hierarchy', authenticateToken, taskController.getMyTaskHierarchy);

// User: my task count
router.get('/my/count', authenticateToken, taskController.getMyTaskCount);

// Admin: stats
router.get('/stats', authenticateToken, requirePermissionAction('manage_tasks', 'view'), taskController.getStats);

// Admin/User: get task by id
router.get('/:id', authenticateToken, taskController.getTask);

// Admin/Assignee: update task
router.put('/:id', authenticateToken, taskController.updateTask);

// Admin: delete task
router.delete('/:id', authenticateToken, taskController.deleteTask);

// Admin: duplicate task
router.post('/:id/duplicate', authenticateToken, requirePermissionAction('manage_tasks', 'create'), taskController.duplicateTask);

// Admin: unassign task
router.delete('/:taskId/unassign/:assignmentType/:referenceId', authenticateToken, requirePermissionAction('manage_tasks', 'assign'), taskController.unassignTask);

// User/Admin: add comment (supports inline attachments + @mentions)
router.post('/:taskId/comments', authenticateToken, commentUploadMiddleware, taskController.addComment);

// User/Admin: list comments
router.get('/:taskId/comments', authenticateToken, taskController.listComments);

// User/Admin: upload attachment
router.post('/:taskId/attachments', authenticateToken, taskAttachmentUploadMiddleware, taskController.uploadAttachment);

// User/Admin: delete attachment
router.delete('/:taskId/attachments/:attachmentId', authenticateToken, taskController.deleteAttachment);

module.exports = router;

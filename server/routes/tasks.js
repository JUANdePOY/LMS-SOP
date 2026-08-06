const express = require('express');
const multer = require('multer');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
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

const router = express.Router();

// Admin: list all tasks
router.get('/', authenticateToken, taskController.listTasks);

// Admin: create task
router.post('/', authenticateToken, requireAdmin, taskController.createTask);

// Admin: assign task
router.post('/assign', authenticateToken, requireAdmin, taskController.assignTask);

// User/Admin: update progress
router.post('/progress', authenticateToken, taskController.updateProgress);

// User: my tasks
router.get('/my', authenticateToken, taskController.getMyTasks);

// User: my task count
router.get('/my/count', authenticateToken, taskController.getMyTaskCount);

// Admin: stats
router.get('/stats', authenticateToken, requireAdmin, taskController.getStats);

// Admin/User: get task by id
router.get('/:id', authenticateToken, taskController.getTask);

// Admin: update task
router.put('/:id', authenticateToken, requireAdmin, taskController.updateTask);

// Admin: delete task
router.delete('/:id', authenticateToken, requireAdmin, taskController.deleteTask);

// Admin: unassign task
router.delete('/:taskId/unassign/:assignmentType/:referenceId', authenticateToken, requireAdmin, taskController.unassignTask);

// User/Admin: add comment
router.post('/:taskId/comments', authenticateToken, taskController.addComment);

// User/Admin: list comments
router.get('/:taskId/comments', authenticateToken, taskController.listComments);

// User/Admin: upload attachment
router.post('/:taskId/attachments', authenticateToken, taskAttachmentUploadMiddleware, taskController.uploadAttachment);

// User/Admin: delete attachment
router.delete('/:taskId/attachments/:attachmentId', authenticateToken, taskController.deleteAttachment);

module.exports = router;

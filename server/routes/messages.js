const router = require('express').Router();
const multer = require('multer');
const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/auth');
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

// Up to 5 inline attachments per message. A text-only message is still valid,
// so multer must not reject requests that have no file part.
function messageUploadMiddleware(req, res, next) {
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

router.use(authenticateToken);

router.get('/conversations', messageController.listConversations);
router.get('/conversations/:id', messageController.getConversation);
router.post('/conversations', messageController.createConversation);
router.post('/conversations/:conversationId/messages', messageUploadMiddleware, messageController.sendMessage);
router.get('/conversations/:conversationId/messages', messageController.listMessages);
router.patch('/messages/:messageId/read', messageController.markAsRead);
router.delete('/conversations/:id', messageController.deleteConversation);

module.exports = router;

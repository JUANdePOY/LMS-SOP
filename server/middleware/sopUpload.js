const multer = require('multer');
const crypto = require('crypto');
const { getMaxUploadBytes, isAllowedMime, safeExtFromOriginal } = require('../config/uploads');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: getMaxUploadBytes() },
  fileFilter(req, file, cb) {
    if (!isAllowedMime(file.mimetype)) {
      return cb(new Error('Only PDF, JPEG, PNG, DOCX, and XLSX files are allowed'), false);
    }
    if (!safeExtFromOriginal(file.originalname)) {
      return cb(new Error('Invalid file extension'), false);
    }
    cb(null, true);
  },
});

function sopAttachmentUploadMiddleware(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 10MB)' : err.message || 'Upload failed';
      return res.status(400).json({ success: false, message: msg });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'file is required' });
    }
    // memoryStorage() does not set file.filename — generate one
    if (!req.file.filename) {
      const ext = safeExtFromOriginal(req.file.originalname);
      req.file.filename = `${crypto.randomUUID()}${ext}`;
    }
    return next();
  });
}

module.exports = { sopAttachmentUploadMiddleware };

const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const { getMaxUploadBytes } = require('../config/uploads');

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: getMaxUploadBytes() },
  fileFilter(req, file, cb) {
    if (!IMAGE_MIME.has(String(file.mimetype).toLowerCase())) {
      return cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'), false);
    }
    cb(null, true);
  },
});

function announcementImageUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File too large' : err.message || 'Upload failed';
      return res.status(400).json({ success: false, message: msg });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'file is required' });
    }
    const ext = path.extname(req.file.originalname).toLowerCase();
    req.file.filename = `${crypto.randomUUID()}${ALLOWED_EXT.includes(ext) ? ext : '.png'}`;
    next();
  });
}

module.exports = { announcementImageUpload };

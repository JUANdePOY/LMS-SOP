const multer = require('multer');
const { getMaxUploadBytes, safeExtFromOriginal, courseThumbnailDir } = require('../config/uploads');

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
    }
  },
  limits: { fileSize: getMaxUploadBytes() },
});

module.exports = { upload, courseThumbnailDir };

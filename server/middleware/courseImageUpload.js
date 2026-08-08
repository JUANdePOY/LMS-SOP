const multer = require('multer');
const fs = require('fs');
const { getMaxUploadBytes, safeExtFromOriginal, courseImageDir } = require('../config/uploads');
const storage = require('../config/storage');

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'), false);
    }
  },
  limits: { fileSize: getMaxUploadBytes() },
});

function saveCourseImage(courseId, file) {
  const ext = safeExtFromOriginal(file.originalname) || '.bin';
  const base = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  // Stored through the storage abstraction so it is served via the
  // authenticated /api/files/stream route instead of express.static.
  return storage.saveFile({
    buffer: file.buffer,
    dir: `course-images/${courseId}`,
    filename: base,
    contentType: file.mimetype,
  });
}

module.exports = { upload, saveCourseImage };

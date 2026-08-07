const multer = require('multer');
const fs = require('fs');
const { getMaxUploadBytes, safeExtFromOriginal, courseImageDir } = require('../config/uploads');

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
  const dir = courseImageDir(courseId);
  fs.mkdirSync(dir, { recursive: true });
  const ext = safeExtFromOriginal(file.originalname) || '.bin';
  const base = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const abs = require('path').join(dir, base);
  fs.writeFileSync(abs, file.buffer);
  return `/uploads/course-images/${courseId}/${base}`;
}

module.exports = { upload, saveCourseImage };

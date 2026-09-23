const multer = require('multer');
const { getMaxUploadBytes, safeExtFromOriginal } = require('../config/uploads');
const storage = require('../config/storage');

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, Word, Excel, PowerPoint, TXT, and CSV files are allowed'), false);
    }
  },
  limits: { fileSize: getMaxUploadBytes() },
});

function saveCourseDocument(courseId, moduleId, file) {
  const ext = safeExtFromOriginal(file.originalname) || '.bin';
  const base = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
  return storage.saveFile({
    buffer: file.buffer,
    dir: `course-documents/${courseId}/${moduleId}`,
    filename: base,
    contentType: file.mimetype,
  });
}

module.exports = { upload, saveCourseDocument };

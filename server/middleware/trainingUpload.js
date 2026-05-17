const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const { getMaxUploadBytes, trainingDir, externalTrainingDir, isAllowedMime, safeExtFromOriginal } = require('../config/uploads');

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const tid = req.params.trainingId;
    if (tid == null || String(tid).trim() === '') {
      return cb(new Error('trainingId required'));
    }
    const dir = trainingDir(tid);
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      return cb(e);
    }
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = safeExtFromOriginal(file.originalname) || '.bin';
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: getMaxUploadBytes() },
  fileFilter(req, file, cb) {
    if (!isAllowedMime(file.mimetype)) {
      return cb(new Error('Only PDF, JPEG, and PNG files are allowed'));
    }
    if (!safeExtFromOriginal(file.originalname)) {
      return cb(new Error('Invalid file extension'));
    }
    cb(null, true);
  },
});

const letterOrderSingle = upload.single('letter_order');

function letterOrderUploadMiddleware(req, res, next) {
  letterOrderSingle(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File too large' : err.message || 'Upload failed';
      return res.status(400).json({ success: false, message: msg });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'letter_order file is required' });
    }
    return next();
  });
}

const externalStorage = multer.diskStorage({
  destination(req, file, cb) {
    const eid = req.params.id;
    if (eid == null || String(eid).trim() === '') {
      return cb(new Error('external training id required'));
    }
    const dir = externalTrainingDir(eid);
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      return cb(e);
    }
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = safeExtFromOriginal(file.originalname) || '.bin';
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const externalUpload = multer({
  storage: externalStorage,
  limits: { fileSize: getMaxUploadBytes() },
  fileFilter(req, file, cb) {
    if (!isAllowedMime(file.mimetype)) {
      return cb(new Error('Only PDF, JPEG, and PNG files are allowed'));
    }
    if (!safeExtFromOriginal(file.originalname)) {
      return cb(new Error('Invalid file extension'));
    }
    cb(null, true);
  },
});

const externalLetterOrderSingle = externalUpload.single('letter_order');

function externalLetterOrderUploadMiddleware(req, res, next) {
  externalLetterOrderSingle(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File too large' : err.message || 'Upload failed';
      return res.status(400).json({ success: false, message: msg });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'letter_order file is required' });
    }
    return next();
  });
}

module.exports = { letterOrderUploadMiddleware, externalLetterOrderUploadMiddleware };

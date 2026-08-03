const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { getMaxUploadBytes, isAllowedMime, safeExtFromOriginal, certificateRoot, certificateTemplateDir } = require('../config/uploads');

const ALLOWED_FRAME_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/jpg',
]);

const ALLOWED_FRAME_EXT = new Set(['.jpg', '.jpeg', '.png']);

function frameUploadMiddleware(req, res, next) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: getMaxUploadBytes() },
    fileFilter(req, file, cb) {
      const ext = safeExtFromOriginal(file.originalname);
      if (!ALLOWED_FRAME_MIME.has(file.mimetype.toLowerCase()) && !ALLOWED_FRAME_EXT.has(ext)) {
        return cb(new Error('Only JPEG and PNG image files are allowed for certificate frames'), false);
      }
      if (!ALLOWED_FRAME_EXT.has(ext)) {
        return cb(new Error('Invalid file extension for frame image'), false);
      }
      cb(null, true);
    },
  }).single('frame');

  upload(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 10MB)' : err.message || 'Upload failed';
      return res.status(400).json({ success: false, message: msg });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'frame file is required' });
    }
    next();
  });
}

function optionalFrameUploadMiddleware(req, res, next) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: getMaxUploadBytes() },
    fileFilter(req, file, cb) {
      const ext = safeExtFromOriginal(file.originalname);
      if (!ALLOWED_FRAME_MIME.has(file.mimetype.toLowerCase()) && !ALLOWED_FRAME_EXT.has(ext)) {
        return cb(new Error('Only JPEG and PNG image files are allowed for certificate frames'), false);
      }
      if (!ALLOWED_FRAME_EXT.has(ext)) {
        return cb(new Error('Invalid file extension for frame image'), false);
      }
      cb(null, true);
    },
  }).single('frame');

  upload(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 10MB)' : err.message || 'Upload failed';
      return res.status(400).json({ success: false, message: msg });
    }
    next();
  });
}

function signatureUploadMiddleware(req, res, next) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: getMaxUploadBytes() },
    fileFilter(req, file, cb) {
      const ext = safeExtFromOriginal(file.originalname);
      if (!ALLOWED_FRAME_MIME.has(file.mimetype.toLowerCase()) && !ALLOWED_FRAME_EXT.has(ext)) {
        return cb(new Error('Only JPEG and PNG image files are allowed for signatures/seals'), false);
      }
      if (!ALLOWED_FRAME_EXT.has(ext)) {
        return cb(new Error('Invalid file extension for signature image'), false);
      }
      cb(null, true);
    },
  }).single('signature');

  upload(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 10MB)' : err.message || 'Upload failed';
      return res.status(400).json({ success: false, message: msg });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'signature file is required' });
    }
    next();
  });
}

module.exports = {
  frameUploadMiddleware,
  optionalFrameUploadMiddleware,
  signatureUploadMiddleware,
};

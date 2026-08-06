// taskAttachmentPublicFile.js
//
// Serves attachment binary data stored as LONGBLOB so a plain <img src="...">
// tag can load it inline.
//
// Deliberately NOT mounted under the authenticated /api/tasks router — an
// <img> tag can't send an Authorization header. Instead each request must
// carry the HMAC token from taskAttachmentService.buildViewUrl(), which is
// scoped to exactly one attachment id and can't be forged without the server
// secret.
//
// Mount this in your main app file (app.js / server.js), e.g.:
//   const taskAttachmentPublicFile = require('./services/taskAttachmentPublicFile');
//   app.use('/api/tasks/attachments', taskAttachmentPublicFile);
// It must NOT sit behind the same router that calls `.use(authenticateToken)`.

const express = require('express');
const crypto = require('crypto');
const taskAttachmentModel = require('../models/taskAttachmentModel');

function getViewSecret() {
  const secret = process.env.ATTACHMENT_VIEW_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('ATTACHMENT_VIEW_SECRET (or JWT_SECRET) must be set to serve inline attachment images');
  }
  return secret;
}

function signAttachmentToken(attachmentId) {
  return crypto.createHmac('sha256', getViewSecret()).update(String(attachmentId)).digest('hex');
}

function verifyAttachmentToken(attachmentId, token) {
  if (!token) return false;
  const expected = signAttachmentToken(attachmentId);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(token));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const router = express.Router();

router.get('/:attachmentId/file', async (req, res) => {
  try {
    const attachmentId = parseInt(req.params.attachmentId, 10);
    const { token } = req.query;
    if (!Number.isInteger(attachmentId)) {
      return res.status(404).end();
    }

    if (!verifyAttachmentToken(attachmentId, token)) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } });
    }

    const attachment = await taskAttachmentModel.findById(attachmentId);
    if (!attachment || !attachment.file_data) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } });
    }

    res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.original_name || attachment.file_name || 'file')}"`);
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    return res.send(attachment.file_data);
  } catch (error) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } });
  }
});

/** Relative URL an <img>/<a> can use directly — no auth header required. */
function buildViewUrl(attachmentId, req) {
  const path = `/api/tasks/attachments/${attachmentId}/file?token=${signAttachmentToken(attachmentId)}`;
  if (!req) return path;
  const protocol = req.get('x-forwarded-proto')?.split(',')[0].trim() || req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}${path}`;
}

module.exports = {
  router,
  signAttachmentToken,
  buildViewUrl,
};

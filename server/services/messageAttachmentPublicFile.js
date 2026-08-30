// messageAttachmentPublicFile.js
//
// Serves inline attachment binaries (stored as LONGBLOB) for chat messages so a
// plain <img src="..."> tag can render them. Like the task attachment viewer,
// it relies on an HMAC token (scoped to one attachment id) instead of an
// Authorization header, because <img>/<a> tags can't send one.
//
// Mount in server.js, e.g.:
//   app.use('/api/messages/attachments', messageAttachmentPublicFile.router);

const express = require('express');
const crypto = require('crypto');
const messageModel = require('../models/messageModel');

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

    const attachment = await messageModel.getMessageAttachmentById(attachmentId);
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

function buildViewUrl(attachmentId, req) {
  const path = `/api/messages/attachments/${attachmentId}/file?token=${signAttachmentToken(attachmentId)}`;
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

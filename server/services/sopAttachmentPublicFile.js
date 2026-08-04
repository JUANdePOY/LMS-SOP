// sopAttachmentPublicFile.js
//
// Serves attachment binary data (images pasted/dropped/uploaded into the SOP
// rich-text editor) so a plain <img src="..."> tag can load it inline.
//
// Deliberately NOT mounted under the authenticated /api/sops router — an
// <img> tag can't send an Authorization header. Instead each request must
// carry the HMAC token from sopAttachmentService.buildViewUrl(), which is
// scoped to exactly one attachment id and can't be forged without the server
// secret. See sopAttachmentService.js for the signing logic.
//
// Mount this in your main app file (app.js / server.js), e.g.:
//   const sopAttachmentPublicFile = require('./routes/sopAttachmentPublicFile');
//   app.use('/api/sops/attachments', sopAttachmentPublicFile);
// It must NOT sit behind the same router that calls `.use(authenticateToken)`.

const express = require('express');
const sopAttachmentService = require('../services/sopAttachmentService');

const router = express.Router();

router.get('/:attachmentId/file', async (req, res) => {
  try {
    const attachmentId = parseInt(req.params.attachmentId, 10);
    const { token } = req.query;
    if (!Number.isInteger(attachmentId)) {
      return res.status(404).end();
    }

    const attachment = await sopAttachmentService.getAttachmentFileForView(attachmentId, token);

    res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.original_name || attachment.file_name || 'file')}"`);
    // Signed + immutable per attachment id — safe to cache long-term.
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    return res.send(attachment.file_data);
  } catch (error) {
    // Same 404 whether the attachment is missing, deleted, or the token is
    // wrong — don't give an attacker a way to distinguish those cases.
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } });
  }
});

module.exports = router;

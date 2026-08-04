const path = require('path');
const sopAttachmentService = require('../services/sopAttachmentService');

const attachmentController = {
  async list(req, res) {
    const result = await sopAttachmentService.listAttachments(parseInt(req.params.moduleId, 10));
    res.json({ success: true, data: result });
  },

  async upload(req, res) {
    // multer's upload.single('file') (see middleware/sopUpload.js) puts the
    // parsed file on req.file — NOT req.body. req.body only holds plain
    // text fields, which is why file_name/file_data/mime_type/etc were
    // always undefined here and nothing ever got persisted.
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'file is required' });
    }

    const result = await sopAttachmentService.uploadAttachment(
      parseInt(req.params.moduleId, 10),
      {
        file_name: file.filename, // generated in sopUpload.js since memoryStorage() doesn't set one
        original_name: file.originalname,
        mime_type: file.mimetype,
        file_size: file.size,
        file_extension: path.extname(file.originalname).toLowerCase(),
        file_data: file.buffer,
      },
      req.user.id,
      req // needed so buildViewUrl() can return an absolute URL
    );

    res.status(201).json({ success: true, data: result, message: 'Attachment uploaded successfully' });
  },

  async createLink(req, res) {
    const result = await sopAttachmentService.createLink(
      parseInt(req.params.moduleId, 10),
      req.body,
      req.user.id
    );
    res.status(201).json({ success: true, data: result, message: 'Link added successfully' });
  },

  async remove(req, res) {
    const result = await sopAttachmentService.deleteAttachment(
      parseInt(req.params.attachmentId, 10),
      req.user.id
    );
    res.json({ success: true, data: result, message: 'Attachment deleted successfully' });
  },

  async restore(req, res) {
    const result = await sopAttachmentService.restoreAttachment(
      parseInt(req.params.attachmentId, 10),
      req.user.id
    );
    res.json({ success: true, data: result, message: 'Attachment restored successfully' });
  },

  async permanentDelete(req, res) {
    const result = await sopAttachmentService.permanentDeleteAttachment(
      parseInt(req.params.attachmentId, 10),
      req.user.id
    );
    res.json({ success: true, data: result, message: 'Attachment permanently deleted' });
  },

  async listTrashed(req, res) {
    const result = await sopAttachmentService.listTrashedAttachments(parseInt(req.params.moduleId, 10));
    res.json({ success: true, data: result });
  },
};

module.exports = attachmentController;
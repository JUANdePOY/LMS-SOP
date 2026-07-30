const sopAttachmentService = require('../services/sopAttachmentService');

function successResponse(data, message) {
  const response = { success: true, data };
  if (message) response.message = message;
  return response;
}

const attachmentController = {
  async list(req, res) {
    const result = await sopAttachmentService.listAttachments(parseInt(req.params.moduleId, 10));
    res.json({ success: true, data: result });
  },

  async upload(req, res) {
    const result = await sopAttachmentService.uploadAttachment(
      parseInt(req.params.moduleId, 10),
      req.body,
      req.user.id
    );
    res.status(201).json({ success: true, data: result, message: 'Attachment uploaded successfully' });
  },

  async remove(req, res) {
    const result = await sopAttachmentService.deleteAttachment(
      parseInt(req.params.attachmentId, 10),
      req.user.id
    );
    res.json({ success: true, data: result, message: 'Attachment deleted successfully' });
  },
};

module.exports = attachmentController;
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const attachmentModel = require('../models/sopAttachmentModel');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();
router.use(authenticateToken);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, attachmentModel.uploadDir);
  },
  filename: (req, file, cb) => {
    const stamp = Date.now();
    const ext = path.extname(file.originalname || 'file.bin');
    cb(null, `${stamp}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
  },
});
const upload = multer({ storage });

router.get('/:sopId/attachments', async (req, res) => {
  try {
    const attachments = await attachmentModel.listBySop(parseInt(req.params.sopId, 10));
    res.json({ status: 'success', data: attachments });
  } catch (error) {
    console.error('List attachments error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch attachments', code: 'DB_ERROR' });
  }
});

router.post('/:sopId/attachments', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded', code: 'VALIDATION_ERROR' });
    }

    const relativePath = path.relative(path.join(__dirname, '..'), req.file.path).replace(/\\/g, '/');
    const id = await attachmentModel.createAttachment({
      sop_id: parseInt(req.params.sopId, 10),
      file_name: req.file.filename,
      original_name: req.file.originalname,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      storage_path: relativePath,
      uploaded_by: req.user.id,
      document_type: req.body.document_type || 'PDF',
    });

    logAudit({ user_id: req.user.id, action: 'sop.attachment.uploaded', entity_type: 'sop_document', entity_id: id, metadata: { sop_id: req.params.sopId } });
    res.status(201).json({ status: 'success', message: 'Attachment uploaded', data: { id } });
  } catch (error) {
    console.error('Upload attachment error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to upload attachment', code: 'DB_ERROR' });
  }
});

router.delete('/attachments/:id', async (req, res) => {
  try {
    await attachmentModel.deleteAttachment(parseInt(req.params.id, 10));
    res.json({ status: 'success', message: 'Attachment deleted' });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete attachment', code: 'DB_ERROR' });
  }
});

module.exports = router;

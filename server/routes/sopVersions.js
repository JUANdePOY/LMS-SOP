const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const versionModel = require('../models/sopVersionModel');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();
router.use(authenticateToken);

router.get('/:sopId/versions', async (req, res) => {
  try {
    const versions = await versionModel.getVersions(parseInt(req.params.sopId, 10));
    res.json({ status: 'success', data: versions });
  } catch (error) {
    console.error('List versions error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch versions', code: 'DB_ERROR' });
  }
});

router.post('/:sopId/versions', [
  body('version_number').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }
    const id = await versionModel.createVersion({
      sop_id: parseInt(req.params.sopId, 10),
      version_number: req.body.version_number || '1.0',
      title: req.body.title || 'Version',
      description: req.body.description || null,
      content_snapshot: req.body.content_snapshot || null,
      status: req.body.status || 'Draft',
      created_by: req.user.id,
      is_published: Boolean(req.body.is_published),
    });
    logAudit({ user_id: req.user.id, action: 'sop.version.created', entity_type: 'sop_version', entity_id: id, metadata: { sop_id: req.params.sopId } });
    res.status(201).json({ status: 'success', message: 'Version created', data: { id } });
  } catch (error) {
    console.error('Create version error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create version', code: 'DB_ERROR' });
  }
});

router.post('/:sopId/versions/:versionId/restore', async (req, res) => {
  try {
    const restored = await versionModel.restoreVersion(parseInt(req.params.sopId, 10), parseInt(req.params.versionId, 10));
    if (!restored) {
      return res.status(404).json({ status: 'error', message: 'Version not found', code: 'NOT_FOUND' });
    }
    res.json({ status: 'success', message: 'Version restored', data: restored });
  } catch (error) {
    console.error('Restore version error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to restore version', code: 'DB_ERROR' });
  }
});

module.exports = router;

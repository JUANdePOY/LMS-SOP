const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const shareModel = require('../models/sopShareModel');

const router = express.Router();
router.use(authenticateToken);

router.get('/:sopId/shares', async (req, res) => {
  try {
    const shares = await shareModel.listShares(parseInt(req.params.sopId, 10));
    res.json({ status: 'success', data: shares });
  } catch (error) {
    console.error('List shares error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch shares', code: 'DB_ERROR' });
  }
});

router.post('/:sopId/shares', [
  body('share_type').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }
    const id = await shareModel.createShare({
      sop_id: parseInt(req.params.sopId, 10),
      share_type: req.body.share_type || 'internal',
      share_with: req.body.share_with || null,
      permissions: req.body.permissions || 'view',
      created_by: req.user.id,
    });
    res.status(201).json({ status: 'success', message: 'Share created', data: { id } });
  } catch (error) {
    console.error('Create share error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create share', code: 'DB_ERROR' });
  }
});

module.exports = router;

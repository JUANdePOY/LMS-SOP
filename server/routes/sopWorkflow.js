const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const workflowModel = require('../models/sopWorkflowModel');

const router = express.Router();
router.use(authenticateToken);

router.post('/:sopId/transition', [
  body('status').isString().withMessage('Status is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }
    const nextStatus = req.body.status;
    const result = await workflowModel.transitionSop(parseInt(req.params.sopId, 10), nextStatus, req.user.id, { comment: req.body.comment || null });
    res.json({ status: 'success', message: 'Workflow updated', data: result });
  } catch (error) {
    console.error('Workflow transition error:', error);
    res.status(400).json({ status: 'error', message: error.message || 'Invalid workflow transition', code: 'INVALID_TRANSITION' });
  }
});

router.get('/:sopId/audit', async (req, res) => {
  try {
    const logs = await workflowModel.listChangeLogs(parseInt(req.params.sopId, 10));
    res.json({ status: 'success', data: logs });
  } catch (error) {
    console.error('List change logs error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch change logs', code: 'DB_ERROR' });
  }
});

module.exports = router;

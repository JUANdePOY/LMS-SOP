const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const approvalModel = require('../models/sopApprovalModel');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();
router.use(authenticateToken);

router.get('/:sopId/approvals', async (req, res) => {
  try {
    const approvals = await approvalModel.getApprovals(
      parseInt(req.params.sopId, 10)
    );
    res.json({ status: 'success', data: approvals });
  } catch (error) {
    console.error('List approvals error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch approvals',
      code: 'DB_ERROR',
    });
  }
});

router.post(
  '/:sopId/approvals',
  [
    body('sop_version_id').optional().isInt(),
    body('approver_user_id').optional().isInt(),
    body('status').optional().isIn(['pending', 'approved', 'rejected']),
    body('comments').optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: errors.array(),
        });
      }

      const id = await approvalModel.createApproval({
        sop_id: parseInt(req.params.sopId, 10),
        sop_version_id: req.body.sop_version_id || null,
        approver_user_id: req.body.approver_user_id || req.user.id,
        status: req.body.status || 'pending',
        comments: req.body.comments || null,
      });

      logAudit({
        user_id: req.user.id,
        action: 'sop.approval.created',
        entity_type: 'sop_approval',
        entity_id: id,
        metadata: { sop_id: req.params.sopId },
      });

      res.status(201).json({
        status: 'success',
        message: 'Approval created',
        data: { id },
      });
    } catch (error) {
      console.error('Create approval error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to create approval',
        code: 'DB_ERROR',
      });
    }
  }
);

router.put(
  '/approvals/:approvalId',
  [
    body('status').optional().isIn(['pending', 'approved', 'rejected']),
    body('comments').optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: errors.array(),
        });
      }

      const approvalId = parseInt(req.params.approvalId, 10);
      const existing = await approvalModel.getApprovalById(approvalId);
      if (!existing) {
        return res.status(404).json({
          status: 'error',
          message: 'Approval not found',
          code: 'NOT_FOUND',
        });
      }

      await approvalModel.updateApproval(approvalId, {
        status: req.body.status,
        comments: req.body.comments,
      });

      logAudit({
        user_id: req.user.id,
        action: 'sop.approval.updated',
        entity_type: 'sop_approval',
        entity_id: approvalId,
        metadata: {
          sop_id: existing.sop_id,
          status: req.body.status,
        },
      });

      res.json({
        status: 'success',
        message: 'Approval updated',
      });
    } catch (error) {
      console.error('Update approval error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update approval',
        code: 'DB_ERROR',
      });
    }
  }
);

module.exports = router;
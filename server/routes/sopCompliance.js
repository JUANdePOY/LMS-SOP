const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const assignmentService = require('../services/sopAssignmentService');
const acknowledgementService = require('../services/sopAcknowledgementService');
const complianceModel = require('../models/sopComplianceModel');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();
router.use(authenticateToken);

function handleServiceError(res, error, fallbackMessage) {
  const code = error.code || 'DB_ERROR';
  const statusMap = {
    NOT_FOUND: 404,
    VALIDATION_ERROR: 400,
    DUPLICATE_ASSIGNMENT: 409,
    DUPLICATE_ACKNOWLEDGEMENT: 409,
  };
  const status = statusMap[code] || 500;
  return res.status(status).json({
    status: 'error',
    message: error.message || fallbackMessage,
    code,
    ...(error.details ? { errors: error.details } : {}),
  });
}

router.get('/me/acknowledgements', async (req, res) => {
  try {
    const status = req.query.status || undefined;
    const acknowledgements = await acknowledgementService.listUserAcknowledgements(req.user.id, { status });
    res.json({ status: 'success', data: acknowledgements });
  } catch (error) {
    console.error('List user acknowledgements error:', error);
    handleServiceError(res, error, 'Failed to fetch acknowledgements');
  }
});

router.get('/:sopId/assignments', async (req, res) => {
  try {
    const assignments = await assignmentService.listAssignments(parseInt(req.params.sopId, 10));
    res.json({ status: 'success', data: assignments });
  } catch (error) {
    console.error('List assignments error:', error);
    handleServiceError(res, error, 'Failed to fetch assignments');
  }
});

router.post('/:sopId/assignments', [
  body('assignment_type').optional().isString(),
  body('department_id').optional().isInt(),
  body('position_title').optional().isString(),
  body('user_id').optional().isInt(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }

    const assignment = await assignmentService.createAssignment(
      parseInt(req.params.sopId, 10),
      req.body,
      req.user.id,
    );

    logAudit({
      user_id: req.user.id,
      action: 'sop.assignment.created',
      entity_type: 'sop_assignment',
      entity_id: assignment.id,
      metadata: { sop_id: req.params.sopId, assignment_type: assignment.assignment_type },
    });

    res.status(201).json({ status: 'success', message: 'Assignment created', data: assignment });
  } catch (error) {
    console.error('Create assignment error:', error);
    handleServiceError(res, error, 'Failed to create assignment');
  }
});

router.delete('/assignments/:id', async (req, res) => {
  try {
    const assignment = await assignmentService.deleteAssignment(parseInt(req.params.id, 10));
    logAudit({
      user_id: req.user.id,
      action: 'sop.assignment.deleted',
      entity_type: 'sop_assignment',
      entity_id: assignment.id,
      metadata: { sop_id: assignment.sop_id },
    });
    res.json({ status: 'success', message: 'Assignment deleted' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    handleServiceError(res, error, 'Failed to delete assignment');
  }
});

router.get('/:sopId/acknowledgements/stats', async (req, res) => {
  try {
    const stats = await acknowledgementService.getAcknowledgementStats(parseInt(req.params.sopId, 10));
    res.json({ status: 'success', data: stats });
  } catch (error) {
    console.error('Acknowledgement stats error:', error);
    handleServiceError(res, error, 'Failed to fetch acknowledgement stats');
  }
});

router.get('/:sopId/acknowledgements/pending', async (req, res) => {
  try {
    const pending = await acknowledgementService.listPendingAcknowledgements(parseInt(req.params.sopId, 10));
    res.json({ status: 'success', data: pending });
  } catch (error) {
    console.error('List pending acknowledgements error:', error);
    handleServiceError(res, error, 'Failed to fetch pending acknowledgements');
  }
});

router.get('/:sopId/acknowledgements', async (req, res) => {
  try {
    const status = req.query.status || undefined;
    const acknowledgements = await acknowledgementService.listAcknowledgements(parseInt(req.params.sopId, 10), { status });
    res.json({ status: 'success', data: acknowledgements });
  } catch (error) {
    console.error('List acknowledgements error:', error);
    handleServiceError(res, error, 'Failed to fetch acknowledgements');
  }
});

router.post('/:sopId/acknowledgements', [
  body('user_id').isInt().withMessage('user_id is required'),
  body('status').optional().isIn(['Pending', 'Acknowledged']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR', errors: errors.array() });
    }

    const acknowledgement = await acknowledgementService.createAcknowledgement(
      parseInt(req.params.sopId, 10),
      parseInt(req.body.user_id, 10),
      req.body.status || 'Pending',
    );

    res.status(201).json({ status: 'success', message: 'Acknowledgement created', data: acknowledgement });
  } catch (error) {
    console.error('Create acknowledgement error:', error);
    handleServiceError(res, error, 'Failed to create acknowledgement');
  }
});

router.post('/:sopId/acknowledgements/acknowledge', async (req, res) => {
  try {
    const acknowledgement = await acknowledgementService.acknowledgeSop(parseInt(req.params.sopId, 10), req.user.id);
    logAudit({
      user_id: req.user.id,
      action: 'sop.acknowledged',
      entity_type: 'sop_acknowledgement',
      entity_id: acknowledgement.id,
      metadata: { sop_id: req.params.sopId },
    });
    res.json({ status: 'success', message: 'Acknowledged', data: acknowledgement });
  } catch (error) {
    console.error('Acknowledge SOP error:', error);
    handleServiceError(res, error, 'Failed to acknowledge SOP');
  }
});

router.get('/:sopId/approvals', async (req, res) => {
  try {
    const approvals = await complianceModel.listApprovals(parseInt(req.params.sopId, 10));
    res.json({ status: 'success', data: approvals });
  } catch (error) {
    console.error('List approvals error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch approvals', code: 'DB_ERROR' });
  }
});

router.post('/:sopId/approvals', async (req, res) => {
  try {
    const id = await complianceModel.createApproval({
      sop_id: parseInt(req.params.sopId, 10),
      approver_user_id: req.body.approver_user_id,
      status: req.body.status || 'Pending',
      comments: req.body.comments || null,
    });
    res.status(201).json({ status: 'success', message: 'Approval created', data: { id } });
  } catch (error) {
    console.error('Create approval error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create approval', code: 'DB_ERROR' });
  }
});

router.put('/approvals/:id', async (req, res) => {
  try {
    const affected = await complianceModel.updateApproval(parseInt(req.params.id, 10), { status: req.body.status, comments: req.body.comments });
    res.json({ status: 'success', message: 'Approval updated', data: { affected } });
  } catch (error) {
    console.error('Update approval error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update approval', code: 'DB_ERROR' });
  }
});

module.exports = router;

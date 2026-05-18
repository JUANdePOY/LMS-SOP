const express = require('express');
const { query, param, body, validationResult } = require('express-validator');
const attendanceController = require('../controllers/attendanceController');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const router = express.Router();

const rejectInvalid = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  return next();
};

const idParam = [param('id').isInt({ min: 1 })];
const trainingIdParam = [param('trainingId').isInt({ min: 1 })];
const externalTrainingIdParam = [param('externalTrainingId').isInt({ min: 1 })];

// ── Scan endpoints (facilitator only) ────────────────────────────────────────

router.post(
  '/scan/internal/:trainingId',
  authenticateToken,
  authorize('admin'),
  [
    ...trainingIdParam,
    body('barcode').trim().notEmpty().withMessage('Barcode is required'),
    body('scan_method').optional().isIn(['barcode_scanner', 'camera', 'manual']),
    body('device_info').optional().isString().isLength({ max: 500 }),
  ],
  rejectInvalid,
  attendanceController.scanInternal
);

router.post(
  '/scan/external/:externalTrainingId',
  authenticateToken,
  authorize('admin'),
  [
    ...externalTrainingIdParam,
    body('barcode').trim().notEmpty().withMessage('Barcode is required'),
    body('scan_method').optional().isIn(['barcode_scanner', 'camera', 'manual']),
    body('device_info').optional().isString().isLength({ max: 500 }),
  ],
  rejectInvalid,
  attendanceController.scanExternal
);

// ── Manual check-in (facilitator only) ───────────────────────────────────────

router.post(
  '/manual/internal/:trainingId',
  authenticateToken,
  authorize('admin'),
  [
    ...trainingIdParam,
    body('reservist_id').isInt({ min: 1 }).withMessage('reservist_id is required'),
    body('status').isIn(['present', 'absent', 'late', 'excused', 'pending']).withMessage('Invalid status'),
  ],
  rejectInvalid,
  attendanceController.manualCheckInInternal
);

router.post(
  '/manual/external/:externalTrainingId',
  authenticateToken,
  authorize('admin'),
  [
    ...externalTrainingIdParam,
    body('reservist_id').isInt({ min: 1 }).withMessage('reservist_id is required'),
    body('status').isIn(['present', 'absent', 'late', 'excused', 'pending']).withMessage('Invalid status'),
  ],
  rejectInvalid,
  attendanceController.manualCheckInExternal
);

// ── Attendance list & stats ──────────────────────────────────────────────────

router.get(
  '/internal/:trainingId',
  authenticateToken,
  authorize('admin'),
  [...trainingIdParam],
  rejectInvalid,
  attendanceController.getInternalAttendance
);

router.get(
  '/external/:externalTrainingId',
  authenticateToken,
  authorize('admin'),
  [...externalTrainingIdParam],
  rejectInvalid,
  attendanceController.getExternalAttendance
);

// ── Update attendance status ─────────────────────────────────────────────────

router.patch(
  '/:eventType/:id',
  authenticateToken,
  authorize('admin'),
  [
    ...idParam,
    param('eventType').isIn(['internal', 'external']).withMessage('eventType must be internal or external'),
    body('status').isIn(['present', 'absent', 'late', 'excused', 'pending']).withMessage('Invalid status'),
  ],
  rejectInvalid,
  attendanceController.updateStatus
);

// ── Scan audit log ───────────────────────────────────────────────────────────

router.get(
  '/scan-history',
  authenticateToken,
  authorize('admin'),
  [
    query('training_id').optional().isInt({ min: 1 }),
    query('external_training_id').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 200 }),
  ],
  rejectInvalid,
  attendanceController.getScanHistory
);

// ── Facilitator management ───────────────────────────────────────────────────

router.post(
  '/facilitators',
  authenticateToken,
  authorize('admin'),
  [
    body('user_id').isInt({ min: 1 }).withMessage('user_id is required'),
    body('training_id').optional().isInt({ min: 1 }),
    body('external_training_id').optional().isInt({ min: 1 }),
  ],
  rejectInvalid,
  attendanceController.assignFacilitator
);

router.get(
  '/facilitators',
  authenticateToken,
  authorize('admin'),
  [
    query('training_id').optional().isInt({ min: 1 }),
    query('external_training_id').optional().isInt({ min: 1 }),
  ],
  rejectInvalid,
  attendanceController.getFacilitators
);

module.exports = router;

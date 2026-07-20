const express = require('express');
const { query, param, body, validationResult } = require('express-validator');
const trainingsController = require('../controllers/trainingsController');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { letterOrderUploadMiddleware, externalLetterOrderUploadMiddleware } = require('../middleware/trainingUpload');

const router = express.Router();

const rejectInvalid = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  return next();
};

const pageLimitValidators = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

const idParam = [param('id').isInt({ min: 1 })];
const trainingIdParam = [param('trainingId').isInt({ min: 1 })];
const activityIdParam = [param('activityId').isInt({ min: 1 })];
const attachmentIdParam = [param('attachmentId').isInt({ min: 1 })];

// ── Internal trainings ───────────────────────────────────────────────────────

router.get(
  '/internal',
  optionalAuthenticateToken,
  pageLimitValidators,
  rejectInvalid,
  trainingsController.listInternal
);

router.get(
  '/internal/:trainingId/activities',
  optionalAuthenticateToken,
  [...trainingIdParam],
  rejectInvalid,
  trainingsController.listActivities
);

router.get(
  '/internal/:trainingId/participants',
  optionalAuthenticateToken,
  [...trainingIdParam],
  rejectInvalid,
  trainingsController.getInternalTrainingParticipants
);

router.get('/internal/:id', optionalAuthenticateToken, [...idParam], rejectInvalid, trainingsController.getInternal);

router.post(
  '/internal',
  authenticateToken,
  requireAdmin,
  [
    body('title').trim().notEmpty().isLength({ max: 500 }),
    body('start_datetime').optional().isString(),
    body('start_date').optional().isString(),
    body('status').optional().isString(),
    body('participants').optional().isArray(),
  ],
  rejectInvalid,
  trainingsController.createInternal
);

router.patch(
  '/internal/:id',
  authenticateToken,
  requireAdmin,
  [...idParam, body('participants').optional().isArray()],
  rejectInvalid,
  trainingsController.updateInternal
);

router.delete(
  '/internal/:id',
  authenticateToken,
  requireAdmin,
  [...idParam],
  rejectInvalid,
  trainingsController.deleteInternal
);

router.post(
  '/internal/:trainingId/activities',
  authenticateToken,
  requireAdmin,
  [...trainingIdParam, body('title').trim().notEmpty()],
  rejectInvalid,
  trainingsController.createActivity
);

router.patch(
  '/internal/:trainingId/activities/:activityId',
  authenticateToken,
  requireAdmin,
  [...trainingIdParam, ...activityIdParam],
  rejectInvalid,
  trainingsController.updateActivity
);

router.delete(
  '/internal/:trainingId/activities/:activityId',
  authenticateToken,
  requireAdmin,
  [...trainingIdParam, ...activityIdParam],
  rejectInvalid,
  trainingsController.deleteActivity
);

router.post(
  '/internal/:trainingId/attachments/letter-order',
  authenticateToken,
  requireAdmin,
  [...trainingIdParam],
  rejectInvalid,
  letterOrderUploadMiddleware,
  trainingsController.uploadLetterOrder
);

router.get(
  '/internal/:trainingId/attachments/:attachmentId/file',
  optionalAuthenticateToken,
  [...trainingIdParam, ...attachmentIdParam],
  rejectInvalid,
  trainingsController.downloadTrainingAttachment
);

router.get(
  '/internal/:trainingId/attachments',
  optionalAuthenticateToken,
  [...trainingIdParam],
  rejectInvalid,
  trainingsController.listInternalAttachments
);

router.delete(
  '/internal/:trainingId/attachments/:attachmentId',
  authenticateToken,
  requireAdmin,
  [...trainingIdParam, ...attachmentIdParam],
  rejectInvalid,
  trainingsController.deleteInternalAttachment
);

// ── External trainings ───────────────────────────────────────────────────────

router.get(
  '/external',
  optionalAuthenticateToken,
  pageLimitValidators,
  rejectInvalid,
  trainingsController.listExternal
);

router.post(
  '/external/:id/attachments/letter-order',
  authenticateToken,
  requireAdmin,
  [...idParam],
  rejectInvalid,
  externalLetterOrderUploadMiddleware,
  trainingsController.uploadExternalLetterOrder
);

router.get(
  '/external/:id/attachments/:attachmentId/file',
  optionalAuthenticateToken,
  [...idParam, ...attachmentIdParam],
  rejectInvalid,
  trainingsController.downloadExternalTrainingAttachment
);

router.get(
  '/external/:id/attachments',
  optionalAuthenticateToken,
  [...idParam],
  rejectInvalid,
  trainingsController.listExternalAttachments
);

router.delete(
  '/external/:id/attachments/:attachmentId',
  authenticateToken,
  requireAdmin,
  [...idParam, ...attachmentIdParam],
  rejectInvalid,
  trainingsController.deleteExternalAttachment
);

router.get(
  '/external/:id/participants',
  optionalAuthenticateToken,
  [...idParam],
  rejectInvalid,
  trainingsController.getExternalTrainingParticipants
);

router.get('/external/:id', optionalAuthenticateToken, [...idParam], rejectInvalid, trainingsController.getExternal);

router.post(
  '/external',
  authenticateToken,
  requireAdmin,
  [
    body('title').trim().notEmpty(),
    body('start_date').notEmpty(),
    body('squadron_limits').optional().isArray(),
    body('squadron_limits.*.squadron_id').optional().isInt({ min: 1 }),
    body('squadron_limits.*.slot_limit').optional().isInt({ min: 0 }),
  ],
  rejectInvalid,
  trainingsController.createExternal
);

router.patch(
  '/external/:id',
  authenticateToken,
  requireAdmin,
  [...idParam],
  [
    body('squadron_limits').optional().isArray(),
    body('squadron_limits.*.squadron_id').optional().isInt({ min: 1 }),
    body('squadron_limits.*.slot_limit').optional().isInt({ min: 0 }),
  ],
  rejectInvalid,
  trainingsController.updateExternal
);

router.delete(
  '/external/:id',
  authenticateToken,
  requireAdmin,
  [...idParam],
  rejectInvalid,
  trainingsController.deleteExternal
);

router.post(
  '/external/:id/register',
  authenticateToken,
  [...idParam,
    body('participantData').custom((val) => {
      // participantData must be an object or JSON string
      if (val == null) {
        throw new Error('participantData is required');
      }
      let obj = val;
      if (typeof val === 'string') {
        try {
          obj = JSON.parse(val);
        } catch (e) {
          throw new Error('participantData must be valid JSON');
        }
      }
      if (typeof obj !== 'object' || obj === null) {
        throw new Error('participantData must be an object');
      }
      // If squadron_id is provided, validate it's a positive integer
      if (obj.squadron_id != null) {
        if (!Number.isInteger(Number(obj.squadron_id)) || Number(obj.squadron_id) < 1) {
          throw new Error('participantData.squadron_id must be a positive integer');
        }
      }
      // chosen_squadron_id is what the reservist self-registration flow sends
      // to pick which squadron's slot limit the registration counts against
      // (may differ from their assigned squadron — the override flow).
      if (obj.chosen_squadron_id != null) {
        if (!Number.isInteger(Number(obj.chosen_squadron_id)) || Number(obj.chosen_squadron_id) < 1) {
          throw new Error('participantData.chosen_squadron_id must be a positive integer');
        }
      }
      return true;
    })],
  rejectInvalid,
  trainingsController.registerExternal
);

router.get(
  '/external/:id/slots',
  optionalAuthenticateToken,
  [...idParam],
  rejectInvalid,
  trainingsController.getTrainingSlotAvailability
);

router.get(
  '/external/:id/verify-reservist',
  authenticateToken,
  [...idParam, query('service_number').trim().notEmpty()],
  rejectInvalid,
  trainingsController.verifyReservist
);

router.get(
  '/external/:id/registrations',
  authenticateToken,
  requireAdmin,
  [...idParam],
  rejectInvalid,
  trainingsController.listRegistrations
);

// ── Training Statistics for Dashboard (real data for filters & charts) ───────
router.get('/stats', authenticateToken, trainingsController.getTrainingStats);

module.exports = router;
const express = require('express');
const { query, param, body, validationResult } = require('express-validator');
const trainingsController = require('../controllers/trainingsController');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { letterOrderUploadMiddleware } = require('../middleware/trainingUpload');

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

router.get('/internal/:id', optionalAuthenticateToken, [...idParam], rejectInvalid, trainingsController.getInternal);

router.post(
  '/internal',
  authenticateToken,
  authorize('admin'),
  [
    body('title').trim().notEmpty().isLength({ max: 500 }),
    body('start_datetime').optional().isString(),
    body('start_date').optional().isString(),
    body('status').optional().isString(),
    body('is_mandatory').optional().isBoolean(),
    body('activity_is_mandatory').optional().isBoolean(),
  ],
  rejectInvalid,
  trainingsController.createInternal
);

router.patch(
  '/internal/:id',
  authenticateToken,
  authorize('admin'),
  [
    ...idParam,
    body('is_mandatory').optional().isBoolean(),
    body('activity_is_mandatory').optional().isBoolean(),
  ],
  rejectInvalid,
  trainingsController.updateInternal
);

router.delete(
  '/internal/:id',
  authenticateToken,
  authorize('admin'),
  [...idParam],
  rejectInvalid,
  trainingsController.deleteInternal
);

router.post(
  '/internal/:trainingId/activities',
  authenticateToken,
  authorize('admin'),
  [...trainingIdParam, body('title').trim().notEmpty()],
  rejectInvalid,
  trainingsController.createActivity
);

router.patch(
  '/internal/:trainingId/activities/:activityId',
  authenticateToken,
  authorize('admin'),
  [...trainingIdParam, ...activityIdParam],
  rejectInvalid,
  trainingsController.updateActivity
);

router.delete(
  '/internal/:trainingId/activities/:activityId',
  authenticateToken,
  authorize('admin'),
  [...trainingIdParam, ...activityIdParam],
  rejectInvalid,
  trainingsController.deleteActivity
);

router.post(
  '/internal/:trainingId/attachments/letter-order',
  authenticateToken,
  authorize('admin'),
  [...trainingIdParam],
  rejectInvalid,
  letterOrderUploadMiddleware,
  trainingsController.uploadLetterOrder
);

router.get(
  '/internal/:trainingId/attachments/:attachmentId/file',
  authenticateToken,
  authorize('admin'),
  [...trainingIdParam, ...attachmentIdParam],
  rejectInvalid,
  trainingsController.downloadTrainingAttachment
);

// ── External trainings ───────────────────────────────────────────────────────

router.get(
  '/external',
  optionalAuthenticateToken,
  pageLimitValidators,
  rejectInvalid,
  trainingsController.listExternal
);

router.get('/external/:id', optionalAuthenticateToken, [...idParam], rejectInvalid, trainingsController.getExternal);

router.post(
  '/external',
  authenticateToken,
  authorize('admin'),
  [
    body('title').trim().notEmpty(),
    body('start_date').notEmpty(),
    body('is_mandatory').optional().isBoolean(),
  ],
  rejectInvalid,
  trainingsController.createExternal
);

router.patch(
  '/external/:id',
  authenticateToken,
  authorize('admin'),
  [...idParam, body('is_mandatory').optional().isBoolean()],
  rejectInvalid,
  trainingsController.updateExternal
);

router.delete(
  '/external/:id',
  authenticateToken,
  authorize('admin'),
  [...idParam],
  rejectInvalid,
  trainingsController.deleteExternal
);

router.post(
  '/external/:id/register',
  optionalAuthenticateToken,
  [...idParam],
  rejectInvalid,
  trainingsController.registerExternal
);

router.get(
  '/external/:id/registrations',
  authenticateToken,
  authorize('admin'),
  [...idParam],
  rejectInvalid,
  trainingsController.listRegistrations
);

module.exports = router;

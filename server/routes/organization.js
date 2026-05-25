const express = require('express');
const { query, param, validationResult } = require('express-validator');
const organizationController = require('../controllers/organizationController');
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

router.get(
  '/squadrons',
  [query('search').optional().isString(), query('limit').optional().isInt({ min: 1, max: 100 })],
  rejectInvalid,
  organizationController.listSquadrons
);

router.get(
  '/squadrons/:id/reservists',
  authenticateToken,
  authorize('admin'),
  [param('id').isInt({ min: 1 }), query('search').optional().isString(), query('limit').optional().isInt({ min: 1, max: 100 })],
  rejectInvalid,
  organizationController.listSquadronReservists
);

module.exports = router;

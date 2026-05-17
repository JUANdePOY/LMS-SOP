const express = require('express');
const { query, param, validationResult } = require('express-validator');
const { optionalAuthenticateToken } = require('../middleware/auth');
const squadronLookupModel = require('../models/squadronLookupModel');

const router = express.Router();

const rejectInvalid = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  return next();
};

router.get(
  '/',
  optionalAuthenticateToken,
  [
    query('search').optional().trim().isLength({ max: 100 }),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  rejectInvalid,
  async (req, res) => {
    try {
      const { search, limit } = req.query;
      const squadrons = await squadronLookupModel.searchSquadrons({ search, limit });
      res.json({ success: true, data: { squadrons } });
    } catch (err) {
      console.error('Error searching squadrons:', err);
      res.status(500).json({ success: false, message: 'Failed to search squadrons' });
    }
  }
);

router.get(
  '/:squadronId/reservists',
  optionalAuthenticateToken,
  [
    param('squadronId').isInt({ min: 1 }).toInt(),
    query('search').optional().trim().isLength({ max: 100 }),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  rejectInvalid,
  async (req, res) => {
    try {
      const { squadronId } = req.params;
      const { search, limit } = req.query;
      const reservists = await squadronLookupModel.searchReservistsForSquadron({ squadronId, search, limit });
      res.json({ success: true, data: { reservists } });
    } catch (err) {
      console.error('Error searching squadron reservists:', err);
      res.status(500).json({ success: false, message: 'Failed to load reservists' });
    }
  }
);

module.exports = router;

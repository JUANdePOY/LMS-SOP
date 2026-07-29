const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const businessModel = require('../models/businessModel');

const router = express.Router();

router.use(authenticateToken);

// GET /api/hierarchy
router.get('/', async (req, res) => {
  try {
    const hierarchy = await businessModel.getHierarchy();
    res.json({ status: 'success', data: hierarchy });
  } catch (err) {
    console.error('Hierarchy fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch organization hierarchy', code: 'DB_ERROR' });
  }
});

module.exports = router;


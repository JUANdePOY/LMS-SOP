const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const businessModel = require('../models/businessModel');

const router = express.Router();

router.use(authenticateToken);

// GET /api/hierarchy
router.get('/', async (req, res) => {
  try {
    let hierarchy;
    if (req.user.role === 'super_admin') {
      hierarchy = await businessModel.getHierarchy();
    } else {
      if (!req.user.business_id) {
        return res.status(403).json({ status: 'error', message: 'No business scope assigned', code: 'NO_BUSINESS_SCOPE' });
      }
      const business = await businessModel.findById(req.user.business_id);
      if (!business) {
        return res.status(404).json({ status: 'error', message: 'Business not found', code: 'NOT_FOUND' });
      }
      business.departments = await businessModel.getDepartmentTreeForBusiness(req.user.business_id);
      hierarchy = [business];
    }
    res.json({ status: 'success', data: hierarchy });
  } catch (err) {
    console.error('Hierarchy fetch error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch organization hierarchy', code: 'DB_ERROR' });
  }
});

module.exports = router;


const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { businessDepartmentController, requireClientBusinessScope } = require('../controllers/businessDepartmentController');

const router = express.Router();
router.use(authenticateToken);

// GET  /api/client-businesses/:businessId/departments — list departments for a business
router.get('/:businessId/departments', requireClientBusinessScope, businessDepartmentController.list);

// POST /api/client-businesses/:businessId/departments — grant a department access
router.post('/:businessId/departments', requireClientBusinessScope, requireAdmin, businessDepartmentController.grant);

// DELETE /api/client-businesses/:businessId/departments/:departmentId — revoke access
router.delete('/:businessId/departments/:departmentId', requireClientBusinessScope, requireAdmin, businessDepartmentController.revoke);

module.exports = router;

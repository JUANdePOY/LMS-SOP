const express = require('express');
const router = express.Router();
const sopCourseLinkController = require('../controllers/sopCourseLinkController');
const { authenticateToken, authorize } = require('../middleware/auth');

const requireAdmin = authorize('super_admin', 'admin', 'department_head');

router.get('/:courseId/sops', authenticateToken, sopCourseLinkController.listByCourse);
router.post('/:courseId/sops', authenticateToken, requireAdmin, sopCourseLinkController.link);
router.delete('/:courseId/sops/:sopId', authenticateToken, requireAdmin, sopCourseLinkController.unlink);

module.exports = router;

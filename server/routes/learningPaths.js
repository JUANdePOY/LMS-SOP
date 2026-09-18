const express = require('express');
const router = express.Router();
const learningPathController = require('../controllers/learningPathController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission, requirePermissionAction } = require('../middleware/scope');

router.use(authenticateToken);

router.get('/', requirePermission('view_reports'), learningPathController.listPaths);
router.post('/', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'create'), learningPathController.createPath);
router.get('/:id', requirePermission('view_reports'), learningPathController.getPath);
router.put('/:id', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'edit'), learningPathController.updatePath);
router.post('/:id/courses', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'edit'), learningPathController.addCourse);
router.delete('/:id/courses/:courseId', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'delete'), learningPathController.removeCourse);
router.post('/:id/assign', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'assign'), learningPathController.assignPath);

module.exports = router;

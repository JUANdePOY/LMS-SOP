const express = require('express');
const router = express.Router();
const learningPathController = require('../controllers/learningPathController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/scope');

router.use(authenticateToken);

router.get('/', requirePermission('view_reports'), learningPathController.listPaths);
router.post('/', requirePermission('manage_courses'), learningPathController.createPath);
router.get('/:id', requirePermission('view_reports'), learningPathController.getPath);
router.put('/:id', requirePermission('manage_courses'), learningPathController.updatePath);
router.post('/:id/courses', requirePermission('manage_courses'), learningPathController.addCourse);
router.delete('/:id/courses/:courseId', requirePermission('manage_courses'), learningPathController.removeCourse);
router.post('/:id/assign', requirePermission('manage_courses'), learningPathController.assignPath);

module.exports = router;

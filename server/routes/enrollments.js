const express = require('express');
const router = express.Router();
const enrollmentsController = require('../controllers/enrollmentsController');
const { authenticateToken, resolveScope } = require('../middleware/auth');
const { requirePermission, requirePermissionAction, requireBusinessScope } = require('../middleware/scope');

router.use(authenticateToken);
router.use(resolveScope);

router.post('/', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'create'), enrollmentsController.enrollStudent);
router.post('/bulk', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'create'), enrollmentsController.bulkEnroll);
router.post('/department/:department_id', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'create'), enrollmentsController.bulkEnrollByDepartment);
router.get('/', requirePermission('view_reports'), enrollmentsController.listEnrollments);
router.get('/course/:courseId/progress', requirePermission('view_reports'), enrollmentsController.getClassProgress);
router.patch('/:id/approve', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'enroll'), enrollmentsController.approveEnrollment);
router.patch('/:id/reject', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'edit'), enrollmentsController.rejectEnrollment);
router.patch('/:id/status', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'edit'), enrollmentsController.updateEnrollmentStatus);
router.get('/:id', requirePermission('view_reports'), enrollmentsController.getEnrollment);
router.delete('/:id', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'delete'), enrollmentsController.unenrollStudent);

module.exports = router;

const express = require('express');
const router = express.Router();
const enrollmentsController = require('../controllers/enrollmentsController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission, requireBusinessScope } = require('../middleware/scope');

router.use(authenticateToken);

router.post('/', requirePermission('manage_courses'), enrollmentsController.enrollStudent);
router.post('/bulk', requirePermission('manage_courses'), enrollmentsController.bulkEnroll);
router.post('/department/:department_id', requirePermission('manage_courses'), enrollmentsController.bulkEnrollByDepartment);
router.get('/', requirePermission('view_reports'), enrollmentsController.listEnrollments);
router.get('/course/:courseId/progress', requirePermission('view_reports'), enrollmentsController.getClassProgress);
router.patch('/:id/approve', requirePermission('manage_courses'), enrollmentsController.approveEnrollment);
router.patch('/:id/reject', requirePermission('manage_courses'), enrollmentsController.rejectEnrollment);
router.patch('/:id/status', requirePermission('manage_courses'), enrollmentsController.updateEnrollmentStatus);
router.get('/:id', requirePermission('view_reports'), enrollmentsController.getEnrollment);
router.delete('/:id', requirePermission('manage_courses'), enrollmentsController.unenrollStudent);

module.exports = router;

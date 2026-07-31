const express = require('express');
const router = express.Router();
const enrollmentsController = require('../controllers/enrollmentsController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/', enrollmentsController.enrollStudent);
router.post('/bulk', enrollmentsController.bulkEnroll);
router.get('/', enrollmentsController.listEnrollments);
router.get('/course/:courseId/progress', enrollmentsController.getClassProgress);
router.patch('/:id/approve', enrollmentsController.approveEnrollment);
router.patch('/:id/reject', enrollmentsController.rejectEnrollment);
router.patch('/:id/status', enrollmentsController.updateEnrollmentStatus);
router.get('/:id', enrollmentsController.getEnrollment);
router.delete('/:id', enrollmentsController.unenrollStudent);

module.exports = router;

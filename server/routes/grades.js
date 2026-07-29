const express = require('express');
const router = express.Router();
const gradesController = require('../controllers/gradesController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/bulk-import', gradesController.bulkImportGrades);
router.get('/gradebook/:courseId', gradesController.getGradebook);
router.get('/:gradingId/rubric', gradesController.getGradingRubric);
router.post('/:gradingId/rubric', gradesController.createGradingRubric);
router.post('/assignments/:assignmentId/submissions/:submissionId/grade', gradesController.gradeAssignmentSubmission);
router.post('/:courseId/finalize', gradesController.finalizeGrades);
router.post('/:courseId/release', gradesController.releaseGrades);
router.post('/', gradesController.createGrade);
router.put('/:id', gradesController.updateGrade);
router.get('/', gradesController.listGrades);

module.exports = router;

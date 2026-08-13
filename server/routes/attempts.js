const express = require('express');
const router = express.Router();
const quizAttemptController = require('../controllers/quizAttemptController');
const { authenticateToken, authorize } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/', quizAttemptController.startAttempt);
router.get('/', quizAttemptController.listMyAttempts);

// Integrity event logging (student, during an active attempt)
router.post('/violations', quizAttemptController.logViolation);

// Admin-only: override management & violation reports
router.post('/overrides', authorize('super_admin', 'admin', 'department_head'), quizAttemptController.grantOverride);
router.get('/overrides', authorize('super_admin', 'admin', 'department_head'), quizAttemptController.listOverrides);
router.delete('/overrides/:id', authorize('super_admin', 'admin', 'department_head'), quizAttemptController.revokeOverride);
router.get('/violations', authorize('super_admin', 'admin', 'department_head'), quizAttemptController.getViolations);
router.get('/violations/flagged', authorize('super_admin', 'admin', 'department_head'), quizAttemptController.getFlaggedAttempts);
router.get('/violations/by-user', authorize('super_admin', 'admin', 'department_head'), quizAttemptController.getViolationsByUser);
router.get('/violations/user/:userId', authorize('super_admin', 'admin', 'department_head'), quizAttemptController.getViolationsForUser);

// Attempt-specific routes (registered after exact paths above)
router.get('/:id/results', quizAttemptController.getAttemptResults);
router.get('/:quizId/results', quizAttemptController.getQuizResultsForTaker);
router.get('/:id', quizAttemptController.getAttempt);
router.patch('/:id/draft', quizAttemptController.saveDraftAttempt);
router.post('/:id/submit', quizAttemptController.submitAttempt);
router.patch('/:id/cancel', quizAttemptController.cancelAttempt);

module.exports = router;

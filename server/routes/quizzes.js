const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Exact-path routes must be registered before parametric routes
router.get('/', quizController.listQuizzes);
router.get('/all', quizController.requireAdminRole, quizController.listAllQuizzes);
router.get('/banks', quizController.listQuestionBanks);
router.get('/mine', quizController.listMyQuizzes);
router.get('/leaderboard/course/:courseId', quizController.getCourseLeaderboard);

router.post('/', quizController.requireAdminRole, quizController.createQuiz);

router.get('/:id/questions', quizController.listQuestions);
router.post('/:id/questions', quizController.requireAdminRole, quizController.createQuestion);
router.get('/:id/questions/:qid', quizController.getQuestionById);
router.put('/:id/questions/:qid', quizController.requireAdminRole, quizController.updateQuestion);
router.delete('/:id/questions/:qid', quizController.requireAdminRole, quizController.deleteQuestion);
router.patch('/:id/questions/reorder', quizController.requireAdminRole, quizController.reorderQuestions);

router.get('/:id', quizController.getQuiz);
router.put('/:id', quizController.requireAdminRole, quizController.updateQuiz);
router.delete('/:id', quizController.requireAdminRole, quizController.deleteQuiz);
router.patch('/:id/publish', quizController.requireAdminRole, quizController.publishQuiz);
router.patch('/:id/archive', quizController.requireAdminRole, quizController.archiveQuiz);
router.post('/:id/duplicate', quizController.requireAdminRole, quizController.duplicateQuiz);
router.patch('/:id/reorder', quizController.requireAdminRole, quizController.reorderQuestions);
router.get('/:id/leaderboard', quizController.getLeaderboard);
router.get('/:id/results', quizController.getQuizResults);

router.get('/banks/:id', quizController.getQuestionBank);
router.delete('/banks/:id', quizController.requireAdminRole, quizController.deleteQuestionBank);

module.exports = router;

const express = require('express');
const router = express.Router();
const multer = require('multer');
const quizController = require('../controllers/quizController');
const { authenticateToken, resolveScope } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticateToken);
// Resolve permissions + department scope so department_head quiz creation is
// correctly restricted to the head's own department.
router.use(resolveScope);

// Exact-path routes must be registered before parametric routes
router.get('/', quizController.listQuizzes);
router.get('/all', quizController.requireAdminRole, quizController.listAllQuizzes);
router.get('/banks', quizController.listQuestionBanks);
router.get('/mine', quizController.listMyQuizzes);
router.get('/leaderboard/course/:courseId', quizController.getCourseLeaderboard);

router.post('/', quizController.requireAdminRole, quizController.createQuiz);

router.get('/:id/questions', quizController.listQuestions);
router.post('/:id/questions', quizController.requireAdminRole, quizController.createQuestion);
router.post('/:id/import', quizController.requireAdminRole, quizController.importQuestions);
router.post('/:id/import-file', quizController.requireAdminRole, upload.single('file'), quizController.importFromFile);
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

router.get('/:id/hierarchy', quizController.listHierarchy);
router.post('/:id/hierarchy', quizController.requireAdminRole, quizController.createHierarchy);
router.put('/:id/hierarchy/:hid', quizController.requireAdminRole, quizController.updateHierarchy);
router.delete('/:id/hierarchy/:hid', quizController.requireAdminRole, quizController.deleteHierarchy);

module.exports = router;

const express = require('express');
const router = express.Router();
const learningPathController = require('../controllers/learningPathController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', learningPathController.listPaths);
router.post('/', learningPathController.createPath);
router.get('/:id', learningPathController.getPath);
router.put('/:id', learningPathController.updatePath);
router.post('/:id/courses', learningPathController.addCourse);
router.delete('/:id/courses/:courseId', learningPathController.removeCourse);
router.post('/:id/assign', learningPathController.assignPath);

module.exports = router;

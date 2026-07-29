const express = require('express');
const router = express.Router();
const coursesController = require('../controllers/coursesController');
const { authenticateToken } = require('../middleware/auth');

// Public read routes for course catalog and details
router.get('/', coursesController.listCourses);
router.get('/:id', coursesController.getCourse);
router.get('/:courseId/modules', coursesController.listModules);
router.get('/:courseId/modules/:moduleId/content', coursesController.listContent);

// Protected mutation routes
router.use(authenticateToken);
router.post('/', coursesController.createCourse);
router.put('/:id', coursesController.updateCourse);
router.delete('/:id', coursesController.deleteCourse);
router.patch('/:id/archive', coursesController.archiveCourse);
router.patch('/:id/publish', coursesController.publishCourse);
router.post('/:courseId/modules', coursesController.createModule);
router.put('/:courseId/modules/:moduleId', coursesController.updateModule);
router.delete('/:courseId/modules/:moduleId', coursesController.deleteModule);
router.post('/:courseId/modules/:moduleId/content', coursesController.createContent);
router.put('/:courseId/modules/:moduleId/content/:contentId', coursesController.updateContent);
router.delete('/:courseId/modules/:moduleId/content/:contentId', coursesController.deleteContent);

module.exports = router;

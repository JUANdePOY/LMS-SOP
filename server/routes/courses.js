const express = require('express');
const router = express.Router();
const coursesController = require('../controllers/coursesController');
const { authenticateToken } = require('../middleware/auth');
const { upload: courseImageUpload } = require('../middleware/courseImageUpload');

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
router.get('/:id/export/csv', coursesController.exportCourseCSV);
router.get('/:id/export/excel', coursesController.exportCourseExcel);
router.get('/:id/export/pdf', coursesController.exportCoursePDF);
router.post('/:courseId/modules', coursesController.createModule);
router.put('/:courseId/modules/:moduleId', coursesController.updateModule);
router.delete('/:courseId/modules/:moduleId', coursesController.deleteModule);
router.post('/:courseId/modules/:moduleId/content', coursesController.createContent);
router.put('/:courseId/modules/:moduleId/content/:contentId', coursesController.updateContent);
router.delete('/:courseId/modules/:moduleId/content/:contentId', coursesController.deleteContent);
router.post('/:courseId/modules/:moduleId/images', courseImageUpload.single('file'), coursesController.uploadImage);

module.exports = router;

const express = require('express');
const router = express.Router();
const coursesController = require('../controllers/coursesController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission, requireBusinessScope } = require('../middleware/scope');
const { upload: courseImageUpload } = require('../middleware/courseImageUpload');

function handleImageUpload(req, res, next) {
  courseImageUpload.single('file')(req, res, (err) => {
    if (err) {
      const message = err.message || 'Image upload failed';
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ success: false, message, code: 'IMAGE_UPLOAD_ERROR' });
    }
    next();
  });
}

// Public read routes for course catalog and details
router.get('/', coursesController.listCourses);
router.get('/categories', coursesController.listCategories);
router.get('/:id', coursesController.getCourse);
router.get('/:courseId/modules', coursesController.listModules);
router.get('/:courseId/modules/:moduleId/content', coursesController.listContent);

// Protected mutation routes
router.use(authenticateToken);
router.post('/', requirePermission('manage_courses'), coursesController.createCourse);
router.put('/:id', requirePermission('manage_courses'), coursesController.updateCourse);
router.delete('/:id', requirePermission('manage_courses'), coursesController.deleteCourse);
router.patch('/:id/archive', requirePermission('manage_courses'), coursesController.archiveCourse);
router.patch('/:id/publish', requirePermission('manage_courses'), coursesController.publishCourse);
router.get('/:id/export/csv', requirePermission('manage_courses'), coursesController.exportCourseCSV);
router.get('/:id/export/excel', requirePermission('manage_courses'), coursesController.exportCourseExcel);
router.get('/:id/export/pdf', requirePermission('manage_courses'), coursesController.exportCoursePDF);
router.post('/:courseId/modules', requirePermission('manage_courses'), coursesController.createModule);
router.put('/:courseId/modules/:moduleId', requirePermission('manage_courses'), coursesController.updateModule);
router.delete('/:courseId/modules/:moduleId', requirePermission('manage_courses'), coursesController.deleteModule);
router.post('/:courseId/modules/:moduleId/content', requirePermission('manage_courses'), coursesController.createContent);
router.put('/:courseId/modules/:moduleId/content/:contentId', requirePermission('manage_courses'), coursesController.updateContent);
router.delete('/:courseId/modules/:moduleId/content/:contentId', requirePermission('manage_courses'), coursesController.deleteContent);
router.post('/:courseId/modules/:moduleId/images', handleImageUpload, requirePermission('manage_courses'), coursesController.uploadImage);

module.exports = router;

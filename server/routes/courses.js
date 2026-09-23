const express = require('express');
const router = express.Router();
const coursesController = require('../controllers/coursesController');
const { authenticateToken, resolveScope } = require('../middleware/auth');
const { requirePermission, requirePermissionAction, requireBusinessScope, requireEntityTypeAccess } = require('../middleware/scope');
const { upload: courseImageUpload } = require('../middleware/courseImageUpload');

const { upload: courseDocumentUpload } = require('../middleware/courseDocumentUpload');

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

function handleDocumentUpload(req, res, next) {
  courseDocumentUpload.single('file')(req, res, (err) => {
    if (err) {
      const message = err.message || 'Document upload failed';
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ success: false, message, code: 'DOCUMENT_UPLOAD_ERROR' });
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
router.use(authenticateToken, resolveScope);
router.post('/', requireEntityTypeAccess('course'), requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'create'), coursesController.createCourse);
router.put('/:id', requireEntityTypeAccess('course'), requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'edit'), coursesController.updateCourse);
router.delete('/:id', requireEntityTypeAccess('course'), requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'delete'), coursesController.deleteCourse);
router.patch('/:id/archive', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'archive'), coursesController.archiveCourse);
router.patch('/:id/publish', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'publish'), coursesController.publishCourse);
router.patch('/:id/submit-review', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'edit'), coursesController.submitForReview);
router.patch('/:id/approve', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'publish'), coursesController.approveCourse);
router.patch('/:id/reject', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'edit'), coursesController.rejectCourse);
router.get('/:id/export/csv', requirePermission('manage_courses'), coursesController.exportCourseCSV);
router.get('/:id/export/excel', requirePermission('manage_courses'), coursesController.exportCourseExcel);
router.get('/:id/export/pdf', requirePermission('manage_courses'), coursesController.exportCoursePDF);
router.post('/:courseId/modules', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'create'), coursesController.createModule);
router.put('/:courseId/modules/:moduleId', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'edit'), coursesController.updateModule);
router.delete('/:courseId/modules/:moduleId', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'delete'), coursesController.deleteModule);
router.post('/:courseId/modules/:moduleId/content', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'create'), coursesController.createContent);
router.put('/:courseId/modules/:moduleId/content/:contentId', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'edit'), coursesController.updateContent);
router.delete('/:courseId/modules/:moduleId/content/:contentId', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'delete'), coursesController.deleteContent);
router.post('/:courseId/modules/:moduleId/images', handleImageUpload, requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'create'), coursesController.uploadImage);
router.post('/:courseId/modules/:moduleId/documents', handleDocumentUpload, requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'create'), coursesController.uploadDocument);

module.exports = router;

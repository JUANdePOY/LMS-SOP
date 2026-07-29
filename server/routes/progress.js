const express = require('express');
const progressController = require('../controllers/progressController');
const { authenticateToken } = require('../middleware/auth');

function makeCourseRoutes() {
  const router = express.Router();
  router.use(authenticateToken);
  router.get('/:courseId/progress', progressController.getCourseProgress);
  router.post('/:courseId/enroll', progressController.enrollStudent);
  router.get('/:courseId/enrollment-status', progressController.getEnrollmentStatus);
  return router;
}

function makeLessonRoutes() {
  const router = express.Router();
  router.use(authenticateToken);
  router.post('/:lessonId/complete', progressController.markLessonComplete);
  return router;
}

module.exports = {
  courseRoutes: makeCourseRoutes(),
  lessonRoutes: makeLessonRoutes(),
};

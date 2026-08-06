const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { certificateCourseLinkController } = require('../controllers/certificateCourseLinkController');

const certificateCourseLinkRouter = express.Router();
certificateCourseLinkRouter.use(authenticateToken, requireAdmin);

certificateCourseLinkRouter.route('/courses/:courseId/certificates')
  .get(certificateCourseLinkController.listByCourse)
  .post(certificateCourseLinkController.link);

certificateCourseLinkRouter.route('/courses/:courseId/certificates/:templateId')
  .delete(certificateCourseLinkController.unlink);

module.exports = { certificateCourseLinkRouter };

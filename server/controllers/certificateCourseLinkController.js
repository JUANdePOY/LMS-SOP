const certificateCourseLinkService = require('../services/certificateCourseLinkService');

function sendError(res, err, fallback = 'Request failed') {
  const code = err.code || 'INTERNAL_ERROR';
  const status = code === 'NOT_FOUND' ? 404
    : code === 'FORBIDDEN' ? 403
    : code === 'DUPLICATE_LINK' ? 409
    : code === 'VALIDATION_ERROR' ? 400
    : (err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500);
  if (status === 500) console.error('[CertificateCourseLinkController Error]', err);
  return res.status(status).json({ success: false, message: err.message || fallback, code });
}

function parseIdParam(res, value, fieldName) {
  const parsed = parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    res.status(400).json({ success: false, message: `Invalid ${fieldName}`, code: 'VALIDATION_ERROR' });
    return null;
  }
  return parsed;
}

const certificateCourseLinkController = {
  async listByCourse(req, res) {
    try {
      const courseId = parseIdParam(res, req.params.courseId, 'courseId');
      if (courseId === null) return;
      const result = await certificateCourseLinkService.listCourseCertificates(courseId, req.user);
      res.json({ success: true, data: result, message: 'Certificate links retrieved successfully' });
    } catch (err) {
      sendError(res, err, 'Failed to list certificate links');
    }
  },

  async link(req, res) {
    try {
      const courseId = parseIdParam(res, req.params.courseId, 'courseId');
      if (courseId === null) return;
      const { template_id, is_default, display_order } = req.body;
      const result = await certificateCourseLinkService.linkCertificateToCourse(courseId, template_id, {
        is_default,
        display_order,
      }, req.user);
      res.status(201).json({ success: true, data: result, message: 'Certificate linked to course successfully' });
    } catch (err) {
      sendError(res, err, 'Failed to link certificate to course');
    }
  },

  async unlink(req, res) {
    try {
      const courseId = parseIdParam(res, req.params.courseId, 'courseId');
      if (courseId === null) return;
      const templateId = parseIdParam(res, req.params.templateId, 'templateId');
      if (templateId === null) return;
      const result = await certificateCourseLinkService.unlinkCertificateFromCourse(courseId, templateId, req.user);
      res.json({ success: true, data: result, message: 'Certificate unlinked from course successfully' });
    } catch (err) {
      sendError(res, err, 'Failed to unlink certificate from course');
    }
  },
};

module.exports = { certificateCourseLinkController };
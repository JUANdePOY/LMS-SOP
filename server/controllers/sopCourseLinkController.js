const sopCourseLinkService = require('../services/sopCourseLinkService');

function sendError(res, err, fallback = 'Request failed') {
  const code = err.code || 'INTERNAL_ERROR';
  const status = code === 'NOT_FOUND' ? 404 : code === 'FORBIDDEN' ? 403 : code === 'DUPLICATE_LINK' ? 409 : code === 'VALIDATION_ERROR' ? 400 : 500;
  const body = { success: false, message: err.message || fallback, code };
  if (process.env.NODE_ENV !== 'production' && status === 500 && err) {
    body.details = err.message;
  }
  if (status === 500) console.error('[SOP Course Link Controller Error]', err);
  return res.status(status).json(body);
}

const sopCourseLinkController = {
  async listByCourse(req, res) {
    try {
      const result = await sopCourseLinkService.listCourseSops(parseInt(req.params.courseId, 10), req.user);
      res.json({ success: true, data: result });
    } catch (error) {
      sendError(res, error, 'Failed to list course SOPs');
    }
  },

  async link(req, res) {
    try {
      const courseId = parseInt(req.params.courseId, 10);
      const sopId = parseInt(req.body.sop_id, 10);
      const meta = {
        module_id: req.body.module_id || null,
        display_order: req.body.display_order ?? 0,
        is_required: req.body.is_required ?? false,
        link_type: req.body.link_type || 'Reference',
      };

      if (!sopId) {
        return res.status(400).json({ success: false, message: 'sop_id is required', code: 'VALIDATION_ERROR' });
      }

      const result = await sopCourseLinkService.linkSopToCourse(courseId, sopId, meta, req.user);
      res.status(201).json({ success: true, data: result, message: 'SOP linked to course successfully' });
    } catch (error) {
      sendError(res, error, 'Failed to link SOP to course');
    }
  },

  async unlink(req, res) {
    try {
      const courseId = parseInt(req.params.courseId, 10);
      const sopId = parseInt(req.params.sopId, 10);
      const result = await sopCourseLinkService.unlinkSopFromCourse(courseId, sopId, req.user);
      res.json({ success: true, data: result, message: 'SOP unlinked from course successfully' });
    } catch (error) {
      sendError(res, error, 'Failed to unlink SOP from course');
    }
  },
};

module.exports = sopCourseLinkController;

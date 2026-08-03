const certificateTemplateService = require('../services/certificateTemplateService');

function handleError(res, error) {
  const code = error.code || 'INTERNAL_ERROR';
  const status = error.status || (
    code === 'NOT_FOUND' ? 404 :
    code === 'VALIDATION_ERROR' ? 400 :
    code === 'UPLOAD_ERROR' ? 400 :
    code === 'UNAUTHORIZED' ? 401 :
    code === 'FORBIDDEN' ? 403 :
    500
  );
  res.status(status).json({ success: false, error: { code, message: error.message, details: error.details } });
}

const certificateTemplateController = {
  async list(req, res) {
    try {
      const { search, status, department_id, page = 1, limit = 20 } = req.query;
      const result = await certificateTemplateService.listTemplates({
        search,
        status,
        department_id: department_id ? parseInt(department_id, 10) : undefined,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });
      res.json({ success: true, data: result, message: 'Templates retrieved successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async getById(req, res) {
    try {
      const result = await certificateTemplateService.getTemplate(req.params.id);
      res.json({ success: true, data: result, message: 'Template retrieved successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async getFrame(req, res) {
    try {
      const frame = await certificateTemplateService.getTemplateFrame(req.params.id);
      if (!frame || !frame.buffer) {
        const error = new Error('Frame not found');
        error.code = 'NOT_FOUND';
        throw error;
      }
      res.set('Content-Type', frame.mime || 'application/octet-stream');
      res.set('Cache-Control', 'public, max-age=3600');
      if (frame.filename) {
        res.set('Content-Disposition', `inline; filename="${frame.filename}"`);
      }
      res.send(frame.buffer);
    } catch (error) {
      handleError(res, error);
    }
  },

  async create(req, res) {
    try {
      const result = await certificateTemplateService.createTemplate(
        req.body,
        req.file,
        req.user.id
      );
      res.status(201).json({ success: true, data: result, message: 'Certificate template created successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async update(req, res) {
    try {
      const result = await certificateTemplateService.updateTemplate(
        req.params.id,
        req.body,
        req.file,
        req.user.id
      );
      res.json({ success: true, data: result, message: 'Certificate template updated successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async remove(req, res) {
    try {
      const result = await certificateTemplateService.deleteTemplate(req.params.id, req.user.id);
      res.json({ success: true, data: result, message: 'Certificate template deleted successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async getStats(req, res) {
    try {
      const result = await certificateTemplateService.getTemplateStats();
      res.json({ success: true, data: result, message: 'Template stats retrieved successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },
};

module.exports = { certificateTemplateController, handleError };

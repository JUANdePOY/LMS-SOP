const certificateSignatureService = require('../services/certificateSignatureService');

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

const certificateSignatureController = {
  async list(req, res) {
    try {
      const { search, type, limit = 100 } = req.query;
      const result = await certificateSignatureService.listSignatures({
        search,
        type,
        limit: parseInt(limit, 10),
      });
      res.json({ success: true, data: result, message: 'Signatures retrieved successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async getById(req, res) {
    try {
      const result = await certificateSignatureService.getSignature(parseInt(req.params.id, 10));
      res.json({ success: true, data: result, message: 'Signature retrieved successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async getImage(req, res) {
    try {
      const result = await certificateSignatureService.getSignatureImage(parseInt(req.params.id, 10));
      res.set('Content-Type', result.mime || 'application/octet-stream');
      res.set('Cache-Control', 'public, max-age=3600');
      if (result.filename) {
        res.set('Content-Disposition', `inline; filename="${result.filename}"`);
      }
      res.send(result.buffer);
    } catch (error) {
      handleError(res, error);
    }
  },

  async create(req, res) {
    try {
      const result = await certificateSignatureService.createSignature(
        req.file,
        req.body,
        req.user.id
      );
      res.status(201).json({ success: true, data: result, message: 'Signature uploaded successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async update(req, res) {
    try {
      const result = await certificateSignatureService.updateSignature(
        parseInt(req.params.id, 10),
        req.body,
        req.user.id
      );
      res.json({ success: true, data: result, message: 'Signature updated successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async remove(req, res) {
    try {
      const result = await certificateSignatureService.deleteSignature(
        parseInt(req.params.id, 10),
        req.user.id
      );
      res.json({ success: true, data: result, message: 'Signature deleted successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },
};

module.exports = { certificateSignatureController, handleError };

const certificateIssuanceService = require('../services/certificateIssuanceService');

function handleError(res, error) {
  const code = error.code || 'INTERNAL_ERROR';
  const status = error.status || (
    code === 'NOT_FOUND' ? 404 :
    code === 'VALIDATION_ERROR' ? 400 :
    code === 'TEMPLATE_INACTIVE' ? 400 :
    code === 'RENDER_ERROR' ? 500 :
    code === 'INVALID_TRANSITION' ? 400 :
    code === 'UNAUTHORIZED' ? 401 :
    code === 'FORBIDDEN' ? 403 :
    500
  );
  res.status(status).json({ success: false, error: { code, message: error.message } });
}

function mapPublicIssuance(row) {
  if (!row) return null;

  let resolvedSections = null;
  if (row.resolved_sections) {
    try {
      resolvedSections = typeof row.resolved_sections === 'string'
        ? JSON.parse(row.resolved_sections)
        : row.resolved_sections;
    } catch {
      resolvedSections = null;
    }
  }

  return {
    id: row.id,
    certificate_number: row.certificate_number,
    template_id: row.template_id,
    template_name: row.template_name,
    user_id: row.user_id,
    user_name: row.user_name,
    status: row.status,
    issued_at: row.issued_at,
    issued_by_name: row.issued_by_name,
    expires_at: row.expires_at,
    revoked_at: row.revoked_at,
    resolved_sections: resolvedSections,
    pdf_storage_path: row.pdf_storage_path || null,
  };
}

const certificateIssuanceController = {
  async listByUser(req, res) {
    try {
      const userId = parseInt(req.params.userId, 10);

      const isAdmin = ['super_admin', 'admin', 'department_head'].includes(req.user?.role);
      if (!isAdmin && userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You can only view your own certificates' },
        });
      }

      const { status, page = 1, limit = 20 } = req.query;
      const result = await certificateIssuanceService.listIssuancesByUser(userId, {
        status,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });

      const rows = result.rows.map(mapPublicIssuance);
      res.json({ success: true, data: { rows, total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages }, message: 'Certificates retrieved successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async getByCertificateNumber(req, res) {
    try {
      const result = await certificateIssuanceService.getIssuanceByCertificateNumber(
        req.params.certificateNumber
      );
      res.json({ success: true, data: mapPublicIssuance(result), message: 'Certificate verified successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },

  async issue(req, res) {
    try {
      const { template_id, user_id, overrides } = req.body;

      const result = await certificateIssuanceService.issueCertificate(
        {
          template_id: parseInt(template_id, 10),
          user_id: parseInt(user_id, 10),
          overrides,
        },
        req.user.id
      );
      res.status(201).json({
        success: true,
        data: mapPublicIssuance(result),
        message: 'Certificate issued successfully',
      });
    } catch (error) {
      handleError(res, error);
    }
  },

  async revoke(req, res) {
    try {
      const result = await certificateIssuanceService.revokeIssuance(
        parseInt(req.params.id, 10),
        req.user.id
      );
      res.json({ success: true, data: mapPublicIssuance(result), message: 'Certificate revoked successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },
};

module.exports = { certificateIssuanceController, handleError, mapPublicIssuance };

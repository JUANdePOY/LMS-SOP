const certificateIssuanceService = require('../services/certificateIssuanceService');
const { broadcastSystemChange } = require('../services/notificationService');
const db = require('../config/database');

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
    verification_code: row.verification_code || null,
    template_id: row.template_id,
    template_name: row.template_name,
    template_public_id: row.template_public_id || null,
    user_id: row.user_id,
    user_name: row.user_name,
    course_id: row.course_id || null,
    enrollment_id: row.enrollment_id || null,
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

  async getStats(req, res) {
    try {
      const [totalRow] = await certificateIssuanceService.db.query('SELECT COUNT(*) AS total FROM certificate_issuances WHERE revoked_at IS NULL');
      const [issuedRow] = await certificateIssuanceService.db.query('SELECT COUNT(*) AS issued FROM certificate_issuances WHERE status = "issued" AND revoked_at IS NULL');
      const [revokedRow] = await certificateIssuanceService.db.query('SELECT COUNT(*) AS revoked FROM certificate_issuances WHERE revoked_at IS NOT NULL');
      res.json({ success: true, data: { total: totalRow[0]?.total || 0, issued: issuedRow[0]?.issued || 0, revoked: revokedRow[0]?.revoked || 0 } });
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
      const { template_id, user_id, overrides, course_id, enrollment_id, verification_code } = req.body;
      const result = await certificateIssuanceService.issueCertificate(
        {
          template_id: parseInt(template_id, 10),
          user_id: parseInt(user_id, 10),
          overrides,
          course_id: course_id ? parseInt(course_id, 10) : undefined,
          enrollment_id: enrollment_id ? parseInt(enrollment_id, 10) : undefined,
          verification_code: verification_code || undefined,
        },
        req.user.id
      );

      const issuance = result;
      broadcastSystemChange({
        title: 'Certificate Issued',
        body: issuance.template_name || 'A certificate has been issued',
        type: 'success',
        link: `/certificates/${issuance.id}`,
        entityType: 'certificate',
        entityId: issuance.id,
      }).catch(() => {});

      res.status(201).json({
        success: true,
        data: mapPublicIssuance(issuance),
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

      broadcastSystemChange({
        title: 'Certificate Revoked',
        body: result.template_name || 'A certificate has been revoked',
        type: 'error',
        link: `/certificates/${result.id}`,
        entityType: 'certificate',
        entityId: result.id,
      }).catch(() => {});

      res.json({ success: true, data: mapPublicIssuance(result), message: 'Certificate revoked successfully' });
    } catch (error) {
      handleError(res, error);
    }
  },
};

module.exports = { certificateIssuanceController, handleError, mapPublicIssuance };

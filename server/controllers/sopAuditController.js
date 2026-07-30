const sopAuditLogService = require('../services/sopAuditLogService');

const auditController = {
  async list(req, res) {
    const result = await sopAuditLogService.listAuditLogs(parseInt(req.params.sopId, 10));
    res.json({ success: true, data: result });
  },
};

module.exports = auditController;
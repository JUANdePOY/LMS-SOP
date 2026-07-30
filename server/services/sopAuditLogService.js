const sopAuditLogModel = require('../models/sopAuditLogModel');

async function listAuditLogs(sopId) {
  return sopAuditLogModel.listBySop(sopId);
}

async function listVersionAuditLogs(versionId) {
  return sopAuditLogModel.listByVersion(versionId);
}

module.exports = {
  listAuditLogs,
  listVersionAuditLogs,
};
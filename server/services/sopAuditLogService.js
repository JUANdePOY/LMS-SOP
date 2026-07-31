const sopAuditLogModel = require('../models/sopAuditLogModel');

async function listAuditLogs(sopId) {
  return sopAuditLogModel.listBySop(sopId);
}

async function listVersionAuditLogs(versionId) {
  return sopAuditLogModel.listByVersion(versionId);
}

async function logEntry(data) {
  return sopAuditLogModel.createEntry(data);
}

module.exports = {
  listAuditLogs,
  listVersionAuditLogs,
  logEntry,
};
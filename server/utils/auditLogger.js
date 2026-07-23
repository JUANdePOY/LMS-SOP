const db = require('../config/database');

function logAuditEntry(params, callback) {
  const query = `
    INSERT INTO audit_logs 
    (user_id, action, entity_type, entity_id, metadata, ip_address, user_agent) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    params.user_id || null,
    params.action,
    params.entity_type,
    params.entity_id || null,
    params.metadata ? JSON.stringify(params.metadata) : null,
    params.ip_address || null,
    params.user_agent || null,
  ];

  db.query(query, values, (err, results) => {
    if (err) {
      console.error('Audit log insertion failed:', err.message);
    }
    if (callback) {
      callback(err, results ? results.insertId : null);
    }
  });
}

function logAudit(actionOrParams, userId, details) {
  if (typeof actionOrParams === 'object' && actionOrParams !== null) {
    return logAuditEntry(actionOrParams, userId);
  }

  return logAuditEntry({
    user_id: userId,
    action: actionOrParams,
    entity_type: 'training',
    metadata: details || null,
  });
}

module.exports = { logAudit };
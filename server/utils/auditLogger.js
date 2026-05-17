const db = require('../config/database');

/**
 * Log an audit entry to the audit_logs table
 * @param {Object} params - Audit parameters
 * @param {number|null} params.user_id - ID of the user performing the action
 * @param {string} params.action - Action performed (e.g., 'reservist.created')
 * @param {string} params.entity_type - Type of entity (e.g., 'reservist')
 * @param {number|null} params.entity_id - ID of the affected entity
 * @param {Object|null} params.old_values - Previous values (for updates/deletes)
 * @param {Object|null} params.new_values - New values (for creates/updates)
 * @param {string|null} params.ip_address - Client IP address
 * @param {string|null} params.user_agent - Client user agent
 * @param {Function} [callback] - Optional callback (err, insertId)
 */
function logAuditEntry(params, callback) {
    const query = `
        INSERT INTO audit_logs 
        (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        params.user_id || null,
        params.action,
        params.entity_type,
        params.entity_id || null,
        params.old_values ? JSON.stringify(params.old_values) : null,
        params.new_values ? JSON.stringify(params.new_values) : null,
        params.ip_address || null,
        params.user_agent || null
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

/** Supports object params or shorthand (action, userId, details) from trainings module. */
function logAudit(actionOrParams, userId, details) {
    if (typeof actionOrParams === 'object' && actionOrParams !== null) {
        return logAuditEntry(actionOrParams, userId);
    }

    return logAuditEntry({
        user_id: userId,
        action: actionOrParams,
        entity_type: 'training',
        new_values: details || null
    });
}

module.exports = { logAudit };

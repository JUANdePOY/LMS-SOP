const logAudit = (action, userId, details) => {
    console.log(`[AUDIT] ${new Date().toISOString()} - User ${userId}: ${action}`, details || '');
};

module.exports = { logAudit };
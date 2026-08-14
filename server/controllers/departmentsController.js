const departmentModel = require('../models/departmentModel');

function sendError(res, err, fallback = 'Request failed') {
  const code = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const message = err.statusCode ? err.message : fallback;
  const body = { success: false, message };
  if (process.env.NODE_ENV !== 'production' && code === 500 && err && typeof err === 'object') {
    if (err.message && err.message !== message) body.details = err.message;
    if (err.sqlMessage) body.sqlMessage = err.sqlMessage;
    if (err.code) body.code = err.code;
  }
  if (code === 500) console.error('[Departments Controller Error]', err);
  return res.status(code).json(body);
}

function getDepartmentLeaderboard(req, res) {
  const period = req.query.period || 'all';
  const validPeriods = ['all', 'week', 'month'];

  if (!validPeriods.includes(period)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid period. Use: all, week, month',
      code: 'VALIDATION_ERROR'
    });
  }

  let effectiveBusinessId = undefined;

  if (req.user.role !== 'super_admin') {
    if (!req.user.business_id) {
      return res.status(403).json({
        success: false,
        message: 'No business scope assigned',
        code: 'NO_BUSINESS_SCOPE'
      });
    }
    effectiveBusinessId = req.user.business_id;
  }

  departmentModel.getDepartmentLeaderboard({ period, business_id: effectiveBusinessId })
    .then((data) => {
      res.json({ success: true, message: 'OK', data, period });
    })
    .catch((err) => sendError(res, err, 'Failed to fetch department leaderboard'));
}

module.exports = {
  getDepartmentLeaderboard
};
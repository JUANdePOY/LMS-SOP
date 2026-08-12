const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth');

async function authenticateWebSocket(token) {
  if (!token) {
    throw new Error('NO_TOKEN');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      throw new Error('INVALID_TOKEN');
    }
    throw new Error('TOKEN_ERROR');
  }

  const [users] = await db.query(
    'SELECT id, role, is_active, department_id, business_id, full_name, email, position_title, employee_id FROM users WHERE id = ?',
    [decoded.userId]
  );

  if (users.length === 0) {
    throw new Error('USER_NOT_FOUND');
  }

  const user = users[0];
  if (!user.is_active) {
    throw new Error('ACCOUNT_DEACTIVATED');
  }

  return user.id;
}

module.exports = { authenticateWebSocket };

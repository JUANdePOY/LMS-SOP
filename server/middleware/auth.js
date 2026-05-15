const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

/** True unless production with explicit JWT enforcement. Set REQUIRE_JWT_AUTH=1 to always require JWT. Set SKIP_JWT_AUTH=0 to require JWT in non-production. */
function shouldSkipJwtAuth() {
  if (process.env.REQUIRE_JWT_AUTH === '1') return false;
  if (process.env.SKIP_JWT_AUTH === '0') return false;
  if (process.env.SKIP_JWT_AUTH === '1') return true;
  return process.env.NODE_ENV !== 'production';
}

function attachDevUserIfAllowed(token) {
  if (process.env.ALLOW_DEV_AUTH !== '1' || !process.env.DEV_AUTH_TOKEN) return null;
  if (token !== process.env.DEV_AUTH_TOKEN) return null;
  return {
    id: Number(process.env.DEV_USER_ID) || 1,
    role: process.env.DEV_USER_ROLE || 'admin',
    email: 'dev@local',
  };
}

/**
 * Local dev: without NODE_ENV=production, protected routes accept requests with no Bearer token (fake admin user).
 * Production: set NODE_ENV=production (default on most hosts). Opt in to JWT before prod with REQUIRE_JWT_AUTH=1.
 */
const authenticateToken = (req, res, next) => {
  if (shouldSkipJwtAuth()) {
    req.user = {
      id: Number(process.env.DEV_USER_ID) || 1,
      role: process.env.DEV_USER_ROLE || 'admin',
      email: 'local-dev@skipped',
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required',
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) {
      req.user = user;
      return next();
    }
    const devUser = attachDevUserIfAllowed(token);
    if (devUser) {
      req.user = devUser;
      return next();
    }
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token',
    });
  });
};

/** Sets req.user when a valid token is present; never blocks the request. */
const optionalAuthenticateToken = (req, res, next) => {
  if (shouldSkipJwtAuth()) {
    req.user = {
      id: Number(process.env.DEV_USER_ID) || 1,
      role: process.env.DEV_USER_ROLE || 'admin',
      email: 'local-dev@skipped',
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) req.user = user;
    else {
      const devUser = attachDevUserIfAllowed(token);
      if (devUser) req.user = devUser;
    }
    return next();
  });
};

module.exports = { authenticateToken, optionalAuthenticateToken };

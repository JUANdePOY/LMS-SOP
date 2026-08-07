const rateLimit = require('express-rate-limit');

// The limiter protects against brute-force. It is keyed by IP + email so that
// switching between *different* accounts from the same machine is not throttled,
// while repeated failed attempts against a single account (or from a single IP)
// are still rate-limited.
//
// It is enabled by default in every environment. To disable it (e.g. for a local
// dev session) set DISABLE_LOGIN_RATE_LIMIT=true explicitly — it is NOT disabled
// merely because NODE_ENV=development.
const isDisabled = process.env.DISABLE_LOGIN_RATE_LIMIT === 'true';

const LOGIN_WINDOW_MS = parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000;
const LOGIN_MAX = parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 10;

const loginLimiter = rateLimit({
  windowMs: LOGIN_WINDOW_MS,
  max: LOGIN_MAX,
  keyGenerator: (req) => {
    const email = (req.body && typeof req.body.email === 'string' ? req.body.email : '').toLowerCase();
    return `${req.ip}:${email}`;
  },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => isDisabled,
  handler: (req, res) => {
    const retryAfter = Math.ceil(LOGIN_WINDOW_MS / 1000);

    res.set({
      'X-RateLimit-Limit': String(LOGIN_MAX),
      'X-RateLimit-Remaining': '0',
      'Retry-After': String(retryAfter),
    });

    res.status(429).json({
      status: 'error',
      message: 'Too many login attempts. Please try again in ' + (retryAfter <= 60 ? retryAfter + ' seconds.' : 'a few minutes.'),
      code: 'RATE_LIMITED',
      retryAfter,
    });
  },
});

module.exports = loginLimiter;


const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV === 'development';

const LOGIN_WINDOW_MS = parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000;
const LOGIN_MAX = parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 5;

const loginLimiter = rateLimit({
  windowMs: LOGIN_WINDOW_MS,
  max: LOGIN_MAX,
  keyGenerator: (req) => req.ip,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => isDev,
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

const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 5,
  keyGenerator: (req) => req.ip,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = 120; // 2 minutes in seconds

    res.set({
      'X-RateLimit-Limit': '5',
      'X-RateLimit-Remaining': '0',
      'Retry-After': String(retryAfter),
    });

    res.status(429).json({
      status: 'error',
      message: 'Too many login attempts. Please try again in 2 minutes.',
      code: 'RATE_LIMITED',
    });
  },
});

module.exports = loginLimiter;
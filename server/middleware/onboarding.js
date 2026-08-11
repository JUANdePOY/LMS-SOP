const sopOnboardingService = require('../services/sopOnboardingService');

async function requireOnboardingComplete(req, res, next) {
  const exemptRoles = ['super_admin', 'admin', 'department_head'];
  if (exemptRoles.includes(req.user?.role)) {
    return next();
  }

  try {
    const complete = await sopOnboardingService.isOnboardingComplete(req.user.id);
    if (!complete) {
      return res.status(403).json({
        status: 'error',
        message: 'Onboarding incomplete. Please read and acknowledge all required SOPs before accessing this feature.',
        code: 'ONBOARDING_REQUIRED'
      });
    }
    next();
  } catch (err) {
    console.error('[Onboarding Middleware] Error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to verify onboarding status',
      code: 'INTERNAL_ERROR'
    });
  }
}

module.exports = {
  requireOnboardingComplete,
};
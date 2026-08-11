const sopOnboardingService = require('../services/sopOnboardingService');

function sendError(res, err, fallback = 'Request failed') {
  const code = err.code || 'INTERNAL_ERROR';
  const status = code === 'NOT_FOUND' ? 404 : code === 'FORBIDDEN' ? 403 : code === 'VALIDATION_ERROR' ? 400 : 500;
  const body = { success: false, message: err.message || fallback, code };
  if (process.env.NODE_ENV !== 'production' && status === 500 && err) {
    body.details = err.message;
  }
  if (status === 500) console.error('[Employee Onboarding Controller Error]', err);
  return res.status(status).json(body);
}

async function getMyOnboarding(req, res) {
  try {
    const pending = await sopOnboardingService.getPendingOnboardingSops(req.user.id);
    const isComplete = pending.length === 0;
    res.json({
      success: true,
      data: {
        is_complete: isComplete,
        pending_count: pending.length,
        items: pending
      }
    });
  } catch (error) {
    sendError(res, error, 'Failed to load onboarding status');
  }
}

async function acknowledgeOnboardingSop(req, res) {
  try {
    const ackId = parseInt(req.params.ackId, 10);
    if (!ackId) {
      const err = new Error('Invalid acknowledgement ID');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    await sopOnboardingService.acknowledgeOnboardingSop(ackId, req.user.id);
    res.json({ success: true, message: 'SOP acknowledged successfully' });
  } catch (error) {
    sendError(res, error, 'Failed to acknowledge SOP');
  }
}

const employeeOnboardingController = {
  getMyOnboarding,
  acknowledgeOnboardingSop,
};

module.exports = employeeOnboardingController;
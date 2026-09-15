const sopOnboardingService = require('../services/sopOnboardingService');
const sopOnboardingSessionService = require('../services/sopOnboardingSessionService');
const db = require('../config/database');

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

async function getOrCreateOnboardingSession(req, res) {
  try {
    const ackId = parseInt(req.params.ackId, 10);
    if (!ackId) {
      const err = new Error('Invalid acknowledgement ID');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const acknowledgement = await db.query(
      `SELECT a.id, a.sop_version_id FROM sop_acknowledgements a
       WHERE a.id = ? AND a.user_id = ? AND a.status = 'Pending'`,
      [ackId, req.user.id]
    ).then(([rows]) => rows[0] || null);

    if (!acknowledgement) {
      const err = new Error('Onboarding SOP not found or already acknowledged');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const status = await sopOnboardingSessionService.getOrCreateSessionStatus({
      acknowledgementId: acknowledgement.id,
      userId: req.user.id,
      sopVersionId: acknowledgement.sop_version_id,
    });

    res.json({ success: true, data: status });
  } catch (error) {
    sendError(res, error, 'Failed to load onboarding session');
  }
}

async function heartbeatOnboardingSession(req, res) {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (!sessionId) {
      const err = new Error('Invalid session ID');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const elapsed = Math.max(0, parseInt(req.body.elapsed_seconds || req.query.elapsed_seconds || 0, 10));
    await sopOnboardingSessionService.heartbeatSession(sessionId, req.user.id, elapsed);
    const status = await sopOnboardingSessionService.getSessionStatus(sessionId, req.user.id);
    res.json({ success: true, data: status });
  } catch (error) {
    sendError(res, error, 'Failed to record heartbeat');
  }
}

const employeeOnboardingController = {
  getMyOnboarding,
  acknowledgeOnboardingSop,
  getOrCreateOnboardingSession,
  heartbeatOnboardingSession,
};

module.exports = employeeOnboardingController;
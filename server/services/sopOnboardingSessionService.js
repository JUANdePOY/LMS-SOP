const sopOnboardingSessionModel = require('../models/sopOnboardingSessionModel');
const sopModel = require('../models/sopModel');
const sopVersionModel = require('../models/sopVersionModel');

async function startOrResumeSession({ acknowledgementId, userId, sopVersionId }) {
  const session = await sopOnboardingSessionModel.getOrCreateSession(acknowledgementId, userId, sopVersionId);
  return session;
}

async function heartbeatSession(sessionId, userId, elapsedSeconds) {
  return sopOnboardingSessionModel.heartbeat(sessionId, userId, elapsedSeconds);
}

async function completeSession(sessionId, userId) {
  return sopOnboardingSessionModel.completeSession(sessionId, userId);
}

async function getSessionStatus(sessionId, userId) {
  const session = await sopOnboardingSessionModel.findByIdAndUser(sessionId, userId);
  if (!session) {
    const error = new Error('Onboarding session not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const version = await sopVersionModel.getVersionById(session.sop_version_id);
  if (!version) {
    const error = new Error('SOP version not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const sop = await sopModel.findById(version.sop_id);
  if (!sop) {
    const error = new Error('SOP not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const minTime = sop.min_time_limit || null;
  const canAcknowledge = !minTime || session.min_time_met === 1 || session.total_seconds >= minTime;

  return {
    session_id: session.id,
    acknowledgement_id: session.acknowledgement_id,
    total_seconds: session.total_seconds,
    min_time_limit: minTime,
    min_time_met: session.min_time_met === 1 || canAcknowledge,
    can_acknowledge: canAcknowledge,
    completed_at: session.completed_at,
  };
}

async function getOrCreateSessionStatus({ acknowledgementId, userId, sopVersionId }) {
  const session = await startOrResumeSession({ acknowledgementId, userId, sopVersionId });
  return getSessionStatus(session.id, userId);
}

async function markSessionMinTimeMet(sessionId, userId) {
  return sopOnboardingSessionModel.markMinTimeMet(sessionId, userId);
}

async function checkAndMarkMinTime(sessionId, userId) {
  const session = await sopOnboardingSessionModel.findByIdAndUser(sessionId, userId);
  if (!session) {
    const error = new Error('Onboarding session not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const version = await sopVersionModel.getVersionById(session.sop_version_id);
  const sop = version ? await sopModel.findById(version.sop_id) : null;
  if (!sop || !sop.min_time_limit) {
    return { min_time_met: true, total_seconds: session.total_seconds };
  }

  if (session.total_seconds >= sop.min_time_limit && !session.min_time_met) {
    await sopOnboardingSessionModel.markMinTimeMet(sessionId, userId);
  }

  return {
    min_time_met: session.min_time_met === 1 || session.total_seconds >= sop.min_time_limit,
    total_seconds: session.total_seconds,
  };
}

module.exports = {
  startOrResumeSession,
  heartbeatSession,
  completeSession,
  getSessionStatus,
  getOrCreateSessionStatus,
  markSessionMinTimeMet,
  checkAndMarkMinTime,
};

const crypto = require('crypto');
const calendarService = require('../services/calendarService');
const calendarModel = require('../models/calendarModel');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

function sendError(res, err, fallback = 'Request failed') {
  const code = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const message = err.statusCode ? err.message : fallback;
  const body = { success: false, message };
  if (err.code) body.code = err.code;
  if (process.env.NODE_ENV !== 'production' && code === 500 && err && typeof err === 'object') {
    if (err.message && err.message !== message) body.details = err.message;
    if (err.sqlMessage) body.sqlMessage = err.sqlMessage;
  }
  if (code === 500) console.error('[Calendar Controller Error]', err);
  return res.status(code).json(body);
}

// Step 1: return OAuth consent URL. We issue a random `state` token and store it
// server-side (keyed by user) so the callback can verify it without depending on
// a shared secret that may differ across worker processes.
function getAuthUrl(req, res) {
  try {
    const userId = req.user.id;
    const stateToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    calendarModel.saveOAuthState(userId, stateToken, expiresAt)
      .then(() => {
        const url = calendarService.buildAuthUrl(stateToken);
        res.json({ success: true, data: { url } });
      })
      .catch((err) => sendError(res, err, 'Failed to start Google Calendar connection'));
  } catch (err) {
    sendError(res, err, 'Failed to start Google Calendar connection');
  }
}

// Step 2: OAuth callback. Verifies state, exchanges code, stores tokens.
function handleCallback(req, res) {
  const { code, state, error, error_description } = req.query;
  try {
    // Google redirects back with ?error=... (e.g. access_denied,
    // redirect_uri_mismatch) instead of ?code=... when consent fails or the
    // redirect URI doesn't match what's registered in Google Cloud. Surface it
    // instead of the generic "Missing parameters".
    if (error) {
      console.error('[Calendar] Google OAuth error:', error, error_description || '');
      return res.status(400).send(renderCallbackHtml(false, `Google error: ${error}${error_description ? ` (${error_description})` : ''}`));
    }
    if (!state || !code) {
      console.error('[Calendar] Callback missing params. originalUrl:', req.originalUrl, '| query:', JSON.stringify(req.query));
      return res.status(400).send(renderCallbackHtml(false, 'Missing parameters'));
    }
    // Verify the state against the server-side record we created in getAuthUrl.
    calendarModel.getOAuthState(state)
      .then((row) => {
        if (!row) {
          return res.status(400).send(renderCallbackHtml(false, 'State verification failed'));
        }
        const userId = row.user_id;
        // Consume the state so it can't be replayed.
        return calendarModel.deleteOAuthState(state)
          .then(() => calendarService.handleCallback(code, userId))
          .then(() => {
            logAudit && logAudit('calendar.connect', userId, {});
            res.send(renderCallbackHtml(true, 'Calendar connected'));
          });
      })
      .catch((err) => {
        sendError(res, err, 'Failed to connect calendar');
      });
  } catch (err) {
    sendError(res, err, 'Failed to connect calendar');
  }
}

function renderCallbackHtml(success, message) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Google Calendar</title></head>
<body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5">
<div style="text-align:center;padding:24px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <h3 style="margin:0 0 8px;color:${success ? '#16a34a' : '#dc2626'}">${success ? 'Connected' : 'Error'}</h3>
  <p style="margin:0;color:#555">${message}</p>
  <p style="margin:12px 0 0;font-size:12px;color:#999">You can close this window.</p>
  <script>
    try { if (window.opener) { window.opener.postMessage({ type: 'calendar-callback', success: ${success} }, '*'); } } catch (e) {}
    // Best-effort auto-close. Under Cross-Origin-Opener-Policy the opener link
    // may be severed, so the opener polls /calendar/status instead and closes
    // this popup itself; closing here handles the normal case.
    setTimeout(function(){ try { window.close(); } catch (e) {} }, 1500);
  </script>
</div></body></html>`;
}

function getStatus(req, res) {
  const userId = req.user.id;
  calendarModel.getToken(userId)
    .then((token) => {
      if (!token) return res.json({ success: true, data: { connected: false } });
      return res.json({
        success: true,
        data: {
          connected: true,
          googleEmail: token.google_email,
          connectedAt: token.connected_at,
        },
      });
    })
    .catch((err) => sendError(res, err, 'Failed to read calendar status'));
}

function syncEvent(req, res) {
  const userId = req.user.id;
  const { eventId } = req.params;
  calendarService.upsertEventForUser(userId, eventId)
    .then((result) => {
      logAudit && logAudit('calendar.sync', userId, { eventId, action: result.action });
      res.json({
        success: true,
        message: result.action === 'created' ? 'Event added to your Google Calendar' : 'Event updated in your Google Calendar',
        data: { googleEventId: result.googleEventId, action: result.action },
      });
    })
    .catch((err) => sendError(res, err, 'Failed to sync event'));
}

function unsyncEvent(req, res) {
  const userId = req.user.id;
  const { eventId } = req.params;
  calendarService.deleteEventForUser(userId, eventId)
    .then(() => {
      logAudit && logAudit('calendar.unsync', userId, { eventId });
      res.json({ success: true, message: 'Event removed from your Google Calendar' });
    })
    .catch((err) => sendError(res, err, 'Failed to remove synced event'));
}

function disconnect(req, res) {
  const userId = req.user.id;
  calendarModel.deleteToken(userId)
    .then(() => calendarModel.deleteMapByUser(userId))
    .then(() => {
      logAudit && logAudit('calendar.disconnect', userId, {});
      res.json({ success: true, message: 'Google Calendar disconnected' });
    })
    .catch((err) => sendError(res, err, 'Failed to disconnect calendar'));
}

module.exports = {
  authenticateToken,
  getAuthUrl,
  handleCallback,
  getStatus,
  syncEvent,
  unsyncEvent,
  disconnect,
};

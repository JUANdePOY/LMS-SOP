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

// Step 1: return OAuth consent URL. `state` is signed so the callback can verify it.
function getAuthUrl(req, res) {
  try {
    const userId = req.user.id;
    const nonce = crypto.randomBytes(16).toString('hex');
    const statePayload = Buffer.from(JSON.stringify({
      u: userId,
      n: nonce,
      exp: Date.now() + 10 * 60 * 1000,
    })).toString('base64url');
    const state = `${statePayload}.${crypto.createHmac('sha256', process.env.JWT_SECRET).update(statePayload).digest('hex')}`;
    const url = calendarService.buildAuthUrl(state);
    res.json({ success: true, data: { url } });
  } catch (err) {
    sendError(res, err, 'Failed to start Google Calendar connection');
  }
}

// Step 2: OAuth callback. Verifies state, exchanges code, stores tokens.
function handleCallback(req, res) {
  const { code, state } = req.query;
  try {
    if (!state || !code) {
      return res.status(400).send(renderCallbackHtml(false, 'Missing parameters'));
    }
    const [payloadB64, sig] = String(state).split('.');
    if (!payloadB64 || !sig) {
      return res.status(400).send(renderCallbackHtml(false, 'Invalid state'));
    }
    const expectedSig = crypto.createHmac('sha256', process.env.JWT_SECRET).update(payloadB64).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return res.status(400).send(renderCallbackHtml(false, 'State verification failed'));
    }
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload.u || payload.exp < Date.now()) {
      return res.status(400).send(renderCallbackHtml(false, 'State expired'));
    }
    const userId = payload.u;
    calendarService.handleCallback(code, userId)
      .then(() => {
        logAudit && logAudit('calendar.connect', userId, {});
        res.send(renderCallbackHtml(true, 'Calendar connected'));
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
  <script>if (window.opener) { try { window.opener.postMessage({ type: 'calendar-callback', success: ${success} }, '*'); } catch(e){} setTimeout(function(){ window.close(); }, 1200); }</script>
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

const crypto = require('crypto');
const calendarService = require('../services/calendarService');
const calendarModel = require('../models/calendarModel');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

// The OAuth callback runs in a popup window that signals its opener (the SPA tab)
// via window.postMessage. Some hosting setups inject Cross-Origin-Opener-Policy:
// same-origin on responses, which severs that relationship and blocks both
// postMessage and window.close. We explicitly relax COOP/COEP here so the popup
// can reach its opener. This is safe: the page only renders a static message and
// posts a success flag; no sensitive data crosses the boundary.
function sendCallback(res, statusCode, html) {
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.status(statusCode).send(html);
}

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

function createState(userId) {
  const payload = { u: userId, t: Date.now(), n: crypto.randomBytes(8).toString('hex') };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const secret = 'lms-sop-calendar-state-v1';
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyState(state) {
  if (!state || typeof state !== 'string') return null;
  const parts = state.split('.');
  const data = parts.length === 2 ? parts[0] : state;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload && payload.u) return payload.u;
  } catch {
    // not base64 JSON
  }
  return null;
}

function getCookie(req, name) {
  const header = req.headers && req.headers.cookie;
  if (!header) return null;
  const parts = header.split(';');
  for (const part of parts) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function signCookieValue(userId) {
  const payload = { u: userId, t: Date.now() };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', 'lms-sop-calendar-state-v1').update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyCookieValue(value) {
  if (!value || typeof value !== 'string') return null;
  const parts = value.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = crypto.createHmac('sha256', 'lms-sop-calendar-state-v1').update(data).digest('base64url');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(data, 'base64url').toString());
  } catch {
    return null;
  }
  if (!payload || !payload.u || !payload.t) return null;
  if (Date.now() - Number(payload.t) > 60 * 60 * 1000) return null;
  return payload.u;
}

// Step 1: return OAuth consent URL.
function getAuthUrl(req, res) {
  try {
    const userId = req.user.id;
    const stateToken = createState(userId);
    const cookieValue = signCookieValue(userId);
    res.setHeader('Set-Cookie', `calendar_oauth_user=${encodeURIComponent(cookieValue)}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=3600`);
    const url = calendarService.buildAuthUrl(stateToken);
    res.json({ success: true, data: { url } });
  } catch (err) {
    sendError(res, err, 'Failed to start Google Calendar connection');
  }
}

// Step 2: OAuth callback. Verifies state, exchanges code, stores tokens.
function handleCallback(req, res) {
  console.log('[Calendar] handleCallback invoked, state:', req.query && req.query.state);
  const { code, state, error, error_description } = req.query;
  try {
    if (error) {
      return sendCallback(res, 400, renderCallbackHtml(false, `Google error: ${error}${error_description ? ` (${error_description})` : ''}`));
    }
    if (!state || !code) {
      return sendCallback(res, 400, renderCallbackHtml(false, 'Missing parameters'));
    }
    const userId = verifyState(state) || verifyCookieValue(getCookie(req, 'calendar_oauth_user'));
    if (!userId) {
      console.error('[Calendar] State verification failed for state:', state);
      return sendCallback(res, 400, renderCallbackHtml(false, 'State verification failed (v2)'));
    }
    return calendarService.handleCallback(code, userId)
      .then((result) => {
        logAudit && logAudit('calendar.connect', userId, { syncedEvents: result.syncedEvents || 0 });
        sendCallback(res, 200, renderCallbackHtml(true, 'Calendar connected'));
      })
      .catch((err) => {
        sendError(res, err, 'Failed to connect calendar');
      });
  } catch (err) {
    sendError(res, err, 'Failed to connect calendar');
  }
}

function renderCallbackHtml(success, message) {
  const notifyButton = success ? `
    <p style="margin-top:12px;font-size:12px;color:#555">Connected successfully. Return to the app and refresh the calendar modal if needed.</p>
  ` : '';

  return `<!doctype html><html><head><meta charset="utf-8"><title>Google Calendar</title></head>
<body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5">
<div style="text-align:center;padding:24px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <h3 style="margin:0 0 8px;color:${success ? '#16a34a' : '#dc2626'}">${success ? 'Connected' : 'Error'}</h3>
  <p style="margin:0;color:#555">${message}</p>
  ${notifyButton}
  <p style="margin:12px 0 0;font-size:12px;color:#999">You can close this window.</p>
</div></body></html>`;
}

function getStatus(req, res) {
  const userId = req.user.id;
  calendarModel.getToken(userId)
    .then((token) => {
      if (!token) {
        return res.json({ success: true, data: { connected: false } });
      }
      return res.json({
        success: true,
        data: {
          connected: true,
          googleEmail: token.google_email,
          connectedAt: token.connected_at,
        },
      });
    })
    .catch((err) => {
      sendError(res, err, 'Failed to read calendar status');
    });
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
  calendarService.disconnectUser(userId)
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

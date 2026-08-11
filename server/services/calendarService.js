const calendarModel = require('../models/calendarModel');
const eventModel = require('../models/eventModel');
const { logAudit } = require('../utils/auditLogger');

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];
const PROVIDER = 'google';

// Lazily load googleapis so the server can boot even if the optional
// dependency is not installed. The Google Calendar feature only fails
// (with a clear message) when it is actually invoked.
let _google = null;
function getGoogle() {
  if (_google) return _google;
  try {
    _google = require('googleapis').google;
  } catch (err) {
    const e = new Error('Google Calendar is not available: the "googleapis" package is not installed');
    e.statusCode = 503;
    e.code = 'CALENDAR_DISABLED';
    throw e;
  }
  return _google;
}

function getClientConfig() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    const err = new Error('Google Calendar is not configured on the server');
    err.statusCode = 503;
    err.code = 'CALENDAR_DISABLED';
    throw err;
  }
  return { clientId, clientSecret, redirectUri };
}

function buildOAuthClient() {
  const { clientId, clientSecret, redirectUri } = getClientConfig();
  const OAuth2 = getGoogle().auth.OAuth2;
  return new OAuth2(clientId, clientSecret, redirectUri);
}

function buildAuthUrl(state) {
  const client = buildOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
    include_granted_scopes: true,
  });
}

// Returns a configured OAuth client with valid (auto-refreshed) credentials.
async function getAuthorizedClient(userId) {
  const token = await calendarModel.getToken(userId, PROVIDER);
  if (!token || !token.access_token) {
    const err = new Error('Google Calendar not connected');
    err.statusCode = 400;
    err.code = 'NOT_CONNECTED';
    throw err;
  }
  const client = buildOAuthClient();
  client.setCredentials({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expiry_date: token.expiry_date,
  });

  // Force a refresh if expired or about to expire (< 5 min).
  const willExpireSoon = !token.expiry_date || token.expiry_date < Date.now() + 5 * 60 * 1000;
  if (willExpireSoon) {
    try {
      const { credentials } = await client.getAccessToken();
      await calendarModel.updateAccessToken(
        userId,
        credentials.access_token,
        credentials.expiry_date || null
      );
    } catch (refreshErr) {
      const err = new Error('Google authorization expired. Please reconnect.');
      err.statusCode = 401;
      err.code = 'TOKEN_REFRESH_FAILED';
      throw err;
    }
  }
  return client;
}

function eventToGooglePayload(event) {
  const start = new Date(event.event_date);
  const end = event.end_date ? new Date(event.end_date) : new Date(start.getTime() + 60 * 60 * 1000);
  return {
    summary: event.title,
    description: `${event.description || ''}\n\n— Synced from LMS-SOP\nOrganizer: ${event.organizer || 'System'}`,
    location: event.location || undefined,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    extendedProperties: {
      private: { lmsEventId: String(event.id), source: 'lms-sop' },
    },
    reminders: { useDefault: true },
  };
}

// Create or update the Google Calendar event for a single user.
// Returns { googleEventId, action }.
async function upsertEventForUser(userId, eventId) {
  const event = await eventModel.findById(eventId);
  if (!event) {
    const err = new Error('Event not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const client = await getAuthorizedClient(userId);
  const calendar = getGoogle().calendar({ version: 'v3', auth: client });

  const existing = await calendarModel.findMap(userId, eventId);
  const payload = eventToGooglePayload(event);

  let googleEventId;
  let action;

  if (existing && existing.sync_status !== 'deleted') {
    // Try to update; if the event was manually deleted on Google, re-create it.
    try {
      const res = await calendar.events.update({
        calendarId: existing.google_calendar_id,
        eventId: existing.google_event_id,
        requestBody: payload,
      });
      googleEventId = res.data.id;
      action = 'updated';
    } catch (updateErr) {
      if (updateErr.code === 404 || updateErr.response?.status === 404) {
        const res = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: payload,
        });
        googleEventId = res.data.id;
        action = 'created';
      } else {
        throw updateErr;
      }
    }
  } else {
    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: payload,
    });
    googleEventId = res.data.id;
    action = 'created';
  }

  await calendarModel.saveMap({
    userId,
    eventId,
    googleEventId,
    googleCalendarId: 'primary',
    syncStatus: 'synced',
  });

  return { googleEventId, action };
}

async function deleteEventForUser(userId, eventId) {
  const existing = await calendarModel.findMap(userId, eventId);
  if (existing && existing.sync_status !== 'deleted') {
    try {
      const client = await getAuthorizedClient(userId);
      const calendar = getGoogle().calendar({ version: 'v3', auth: client });
      await calendar.events.delete({
        calendarId: existing.google_calendar_id,
        eventId: existing.google_event_id,
      });
    } catch (err) {
      // If already gone on Google, treat as success for our mapping.
      if (err.code !== 404 && err.response?.status !== 404) {
        // Surface real failures but still clear our mapping to avoid orphans.
        console.error('[Calendar] delete failed for user', userId, eventId, err.message);
      }
    }
  }
  await calendarModel.deleteMap(userId, eventId);
}

// Propagate an LMS event update/delete to every connected user who has it mapped.
async function propagateEventChange(eventId, action) {
  const maps = await calendarModel.findMapsForEvent(eventId);
  for (const map of maps) {
    try {
      if (action === 'delete') {
        await deleteEventForUser(map.user_id, eventId);
      } else {
        await upsertEventForUser(map.user_id, eventId);
      }
    } catch (err) {
      console.error('[Calendar] propagate failed', action, map.user_id, eventId, err.message);
      try {
        await calendarModel.updateMapStatus(map.user_id, eventId, 'failed');
      } catch { /* best effort */ }
    }
  }
}

// Exchange the OAuth code, persist tokens, return connected email.
async function handleCallback(code, userId) {
  const client = buildOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  let googleEmail = null;
  try {
    const cal = getGoogle().calendar({ version: 'v3', auth: client });
    const about = await cal.about.get({ fields: 'user' });
    googleEmail = about.data.user?.emailAddress || null;
  } catch {
    googleEmail = null;
  }

  const result = await calendarModel.saveToken({
    userId,
    googleEmail,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expiry_date,
    provider: PROVIDER,
  });

  // Push existing LMS events to the freshly connected calendar so the user
  // sees their current schedule immediately. Each event reuses the same
  // upsert path as the manual per-event sync; failures are logged against
  // the mapping but do not abort the connection.
  let syncedEvents = 0;
  try {
    syncedEvents = await syncAllEventsForUser(userId);
    console.log('[Calendar] Initial bulk sync complete for user', userId, '-', syncedEvents, 'event(s) pushed to Google Calendar');
  } catch (syncErr) {
    console.error('[Calendar] initial bulk sync failed for user', userId, syncErr.message);
  }

  return { ...result, syncedEvents };
}

  // Push every active LMS event to the user's connected Google Calendar.
  // Returns the number of events successfully synced.
  async function syncAllEventsForUser(userId) {
    const events = await eventModel.findActive();
    let synced = 0;
    for (const event of events) {
      try {
        await upsertEventForUser(userId, event.id);
        synced += 1;
      } catch (err) {
        console.error('[Calendar] bulk sync failed for user', userId, event.id, err.message);
        try {
          await calendarModel.updateMapStatus(userId, event.id, 'failed');
        } catch { /* best effort */ }
      }
    }
    return synced;
  }

module.exports = {
  SCOPES,
  buildAuthUrl,
  handleCallback,
  upsertEventForUser,
  deleteEventForUser,
  propagateEventChange,
  syncAllEventsForUser,
  calendarModel,
  logAudit,
};

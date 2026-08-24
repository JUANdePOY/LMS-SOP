const db = require('../config/database');
const { DEFAULT_CATEGORIES, DEFAULT_CHANNELS } = require('../migrations/banners');

function defaultPreferencesRow(userId) {
  return {
    user_id: userId,
    categories: DEFAULT_CATEGORIES.reduce((acc, c) => {
      acc[c] = true;
      return acc;
    }, {}),
    channels: { ...DEFAULT_CHANNELS },
    quiet_hours_enabled: 0,
    quiet_hours_start: '22:00:00',
    quiet_hours_end: '07:00:00',
    timezone: 'UTC',
  };
}

async function getPreferences(userId) {
  const [rows] = await db.query('SELECT * FROM user_notification_preferences WHERE user_id = ?', [userId]);
  if (rows.length === 0) {
    const defaults = defaultPreferencesRow(userId);
    await db.query(
      `INSERT INTO user_notification_preferences
        (user_id, categories, channels, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, timezone)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        JSON.stringify(defaults.categories),
        JSON.stringify(defaults.channels),
        defaults.quiet_hours_enabled,
        defaults.quiet_hours_start,
        defaults.quiet_hours_end,
        defaults.timezone,
      ]
    );
    return defaults;
  }

  const row = rows[0];
  let categories;
  let channels;
  try {
    categories = typeof row.categories === 'string' ? JSON.parse(row.categories) : row.categories;
  } catch {
    categories = defaultPreferencesRow(userId).categories;
  }
  try {
    channels = typeof row.channels === 'string' ? JSON.parse(row.channels) : row.channels;
  } catch {
    channels = { ...DEFAULT_CHANNELS };
  }

  // Guarantee every default category/channel exists.
  DEFAULT_CATEGORIES.forEach((c) => {
    if (typeof categories[c] === 'undefined') categories[c] = true;
  });
  Object.keys(DEFAULT_CHANNELS).forEach((ch) => {
    if (typeof channels[ch] === 'undefined') channels[ch] = DEFAULT_CHANNELS[ch];
  });

  return {
    user_id: row.user_id,
    categories,
    channels,
    quiet_hours_enabled: row.quiet_hours_enabled,
    quiet_hours_start: row.quiet_hours_start,
    quiet_hours_end: row.quiet_hours_end,
    timezone: row.timezone || 'UTC',
  };
}

async function updatePreferences(userId, patch) {
  const current = await getPreferences(userId);

  if (patch.categories && typeof patch.categories === 'object') {
    Object.keys(patch.categories).forEach((key) => {
      if (DEFAULT_CATEGORIES.includes(key)) {
        current.categories[key] = Boolean(patch.categories[key]);
      }
    });
  }
  if (patch.channels && typeof patch.channels === 'object') {
    Object.keys(patch.channels).forEach((key) => {
      if (key in DEFAULT_CHANNELS) {
        current.channels[key] = Boolean(patch.channels[key]);
      }
    });
  }
  if (typeof patch.quiet_hours_enabled !== 'undefined') {
    current.quiet_hours_enabled = patch.quiet_hours_enabled ? 1 : 0;
  }
  if (patch.quiet_hours_start) current.quiet_hours_start = patch.quiet_hours_start;
  if (patch.quiet_hours_end) current.quiet_hours_end = patch.quiet_hours_end;
  if (patch.timezone) current.timezone = patch.timezone;

  await db.query(
    `UPDATE user_notification_preferences
     SET categories = ?, channels = ?, quiet_hours_enabled = ?, quiet_hours_start = ?, quiet_hours_end = ?, timezone = ?
     WHERE user_id = ?`,
    [
      JSON.stringify(current.categories),
      JSON.stringify(current.channels),
      current.quiet_hours_enabled,
      current.quiet_hours_start,
      current.quiet_hours_end,
      current.timezone,
      userId,
    ]
  );

  return current;
}

// Channel: 'in_app' | 'push' | 'email' | 'sound'
async function isCategoryEnabled(userId, category) {
  const prefs = await getPreferences(userId);
  if (!category || category === 'system') return true;
  return Boolean(prefs.categories[category]);
}

async function isChannelEnabled(userId, channel) {
  const prefs = await getPreferences(userId);
  return Boolean(prefs.channels[channel]);
}

function currentTimeInZone(timezone) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const hour = parts.find((p) => p.type === 'hour')?.value || '00';
    const minute = parts.find((p) => p.type === 'minute')?.value || '00';
    return `${hour}:${minute}:00`;
  } catch {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}:00`;
  }
}

async function isQuietHours(userId) {
  const prefs = await getPreferences(userId);
  if (!prefs.quiet_hours_enabled) return false;
  const now = currentTimeInZone(prefs.timezone || 'UTC');
  const start = prefs.quiet_hours_start || '22:00:00';
  const end = prefs.quiet_hours_end || '07:00:00';

  if (start <= end) {
    return now >= start && now < end;
  }
  // Wraps past midnight (e.g. 22:00 -> 07:00).
  return now >= start || now < end;
}

module.exports = {
  getPreferences,
  updatePreferences,
  isCategoryEnabled,
  isChannelEnabled,
  isQuietHours,
};

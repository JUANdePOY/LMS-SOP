const db = require('../config/database');

const VALID_TYPES = ['announcement', 'alert', 'event', 'achievement', 'new_course', 'new_sop', 'onboarding', 'promo'];
const VALID_STATUS = ['draft', 'active', 'paused', 'archived'];
const VALID_EVENTS = ['impression', 'click', 'dismiss', 'snooze'];

// Only these types may occupy the prime top-of-page banner slot. `promo` and
// `announcement` are deliberately excluded — promo/marketing stays in the
// notification center (low-friction policy), and routine announcements already
// have their own feed + dropdown surface.
const BANNER_SLOT_TYPES = ['alert', 'achievement', 'new_course', 'new_sop', 'event', 'onboarding'];

// Event reminders only surface within this window before they start; older or
// far-future events remain in the dropdown instead of nagging from the banner.
const EVENT_PROXIMITY_HOURS = 48;
// "New" content banners are only banner-eligible while freshly published.
const NEW_CONTENT_FRESHNESS_DAYS = 7;

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    if (!value.trim()) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

async function createBanner({
  title,
  message = null,
  type = 'announcement',
  ctaLabel = null,
  ctaLink = null,
  imageUrl = null,
  priority = 0,
  status = 'draft',
  startAt = null,
  endAt = null,
  audience = 'all',
  targetRoles = null,
  targetDepartments = null,
  targetUserIds = null,
  createdBy = null,
}) {
  const safeType = VALID_TYPES.includes(type) ? type : 'announcement';
  const safeStatus = VALID_STATUS.includes(status) ? status : 'draft';
  const roles = normalizeArray(targetRoles);
  const departments = normalizeArray(targetDepartments).map(Number).filter(Boolean);
  const users = normalizeArray(targetUserIds).map(Number).filter(Boolean);

  const [result] = await db.query(
    `INSERT INTO banners
      (title, message, type, cta_label, cta_link, image_url, priority, status, start_at, end_at, audience, target_roles, target_departments, target_user_ids, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      String(title).slice(0, 255),
      message || null,
      safeType,
      ctaLabel || null,
      ctaLink || null,
      imageUrl || null,
      Number(priority) || 0,
      safeStatus,
      startAt || null,
      endAt || null,
      audience,
      JSON.stringify(roles),
      JSON.stringify(departments),
      JSON.stringify(users),
      createdBy || null,
    ]
  );
  return result[0]?.insertId || null;
}

async function updateBanner(id, patch) {
  const fields = [];
  const params = [];

  if (patch.title != null) {
    fields.push('title = ?');
    params.push(String(patch.title).slice(0, 255));
  }
  if (patch.message !== undefined) {
    fields.push('message = ?');
    params.push(patch.message || null);
  }
  if (patch.type != null) {
    fields.push('type = ?');
    params.push(VALID_TYPES.includes(patch.type) ? patch.type : 'announcement');
  }
  if (patch.ctaLabel !== undefined) {
    fields.push('cta_label = ?');
    params.push(patch.ctaLabel || null);
  }
  if (patch.ctaLink !== undefined) {
    fields.push('cta_link = ?');
    params.push(patch.ctaLink || null);
  }
  if (patch.imageUrl !== undefined) {
    fields.push('image_url = ?');
    params.push(patch.imageUrl || null);
  }
  if (patch.priority != null) {
    fields.push('priority = ?');
    params.push(Number(patch.priority) || 0);
  }
  if (patch.status != null) {
    fields.push('status = ?');
    params.push(VALID_STATUS.includes(patch.status) ? patch.status : 'draft');
  }
  if (patch.startAt !== undefined) {
    fields.push('start_at = ?');
    params.push(patch.startAt || null);
  }
  if (patch.endAt !== undefined) {
    fields.push('end_at = ?');
    params.push(patch.endAt || null);
  }
  if (patch.audience != null) {
    fields.push('audience = ?');
    params.push(patch.audience);
  }
  if (patch.targetRoles !== undefined) {
    fields.push('target_roles = ?');
    params.push(JSON.stringify(normalizeArray(patch.targetRoles)));
  }
  if (patch.targetDepartments !== undefined) {
    fields.push('target_departments = ?');
    params.push(JSON.stringify(normalizeArray(patch.targetDepartments).map(Number).filter(Boolean)));
  }
  if (patch.targetUserIds !== undefined) {
    fields.push('target_user_ids = ?');
    params.push(JSON.stringify(normalizeArray(patch.targetUserIds).map(Number).filter(Boolean)));
  }

  if (fields.length === 0) return false;

  params.push(id);
  const [result] = await db.query(`UPDATE banners SET ${fields.join(', ')} WHERE id = ?`, params);
  return result.affectedRows > 0;
}

async function setBannerStatus(id, status) {
  if (!VALID_STATUS.includes(status)) return false;
  const [result] = await db.query('UPDATE banners SET status = ? WHERE id = ?', [status, id]);
  return result.affectedRows > 0;
}

async function deleteBanner(id) {
  const [result] = await db.query('DELETE FROM banners WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function listBanners({ status = null, limit = 50, offset = 0 } = {}) {
  let where = '';
  const params = [];
  if (status) {
    where = 'WHERE status = ?';
    params.push(status);
  }
  const [rows] = await db.query(
    `SELECT * FROM banners ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return rows;
}

// Audience predicates. JSON columns are passed as JSON-encoded string scalars
// (e.g. '"super_admin"', '5') so JSON_CONTAINS works on both MySQL and MariaDB
// without CAST(... AS JSON), which this MariaDB version does not support.
function audienceConditions(user) {
  const conds = ["audience = 'all'"];
  const params = [];
  if (user.role) {
    conds.push("(audience = 'role' AND JSON_CONTAINS(target_roles, ?))");
    params.push(JSON.stringify(user.role));
  }
  if (user.department_id != null) {
    conds.push("(audience = 'department' AND JSON_CONTAINS(target_departments, ?))");
    params.push(JSON.stringify(user.department_id));
  }
  if (user.id != null) {
    conds.push("(audience = 'user' AND JSON_CONTAINS(target_user_ids, ?))");
    params.push(JSON.stringify(user.id));
  }
  return { sql: `(${conds.join(' OR ')})`, params };
}

async function getActiveBannersForUser(user) {
  const audience = audienceConditions(user);
  const [rows] = await db.query(
    `SELECT b.*
     FROM banners b
     LEFT JOIN banner_dismissals d ON d.banner_id = b.id AND d.user_id = ?
     WHERE b.status = 'active'
       AND b.type IN (${BANNER_SLOT_TYPES.map(() => '?').join(', ')})
       AND (b.start_at IS NULL OR b.start_at <= NOW())
       AND (b.end_at IS NULL OR b.end_at >= NOW())
       AND (b.type <> 'event' OR (b.start_at IS NOT NULL AND b.start_at <= NOW() + INTERVAL ${EVENT_PROXIMITY_HOURS} HOUR))
       AND (b.type NOT IN ('new_course', 'new_sop') OR b.created_at >= NOW() - INTERVAL ${NEW_CONTENT_FRESHNESS_DAYS} DAY)
       AND ${audience.sql}
       AND (d.id IS NULL OR (d.snooze_until IS NOT NULL AND d.snooze_until <= NOW()))
     ORDER BY b.priority DESC, b.created_at DESC
     LIMIT 20`,
    [user.id, ...BANNER_SLOT_TYPES, ...audience.params]
  );
  return rows;
}

async function recordEvent(bannerId, userId, event) {
  if (!VALID_EVENTS.includes(event)) return false;
  await db.query(
    'INSERT INTO banner_impressions (banner_id, user_id, event) VALUES (?, ?, ?)',
    [bannerId, userId, event]
  );

  if (event === 'dismiss' || event === 'snooze') {
    const snoozeUntil = event === 'snooze' ? new Date(Date.now() + 60 * 60 * 1000) : null;
    await db.query(
      `INSERT INTO banner_dismissals (banner_id, user_id, dismissed_at, snooze_until)
       VALUES (?, ?, NOW(), ?)
       ON DUPLICATE KEY UPDATE dismissed_at = NOW(), snooze_until = VALUES(snooze_until)`,
      [bannerId, userId, snoozeUntil]
    );
  }
  return true;
}

async function getBannerStats(bannerId) {
  const [rows] = await db.query(
    `SELECT event, COUNT(*) as count
     FROM banner_impressions
     WHERE banner_id = ?
     GROUP BY event`,
    [bannerId]
  );
  const stats = { impression: 0, click: 0, dismiss: 0, snooze: 0 };
  rows.forEach((r) => {
    stats[r.event] = r.count;
  });
  return stats;
}

module.exports = {
  createBanner,
  updateBanner,
  setBannerStatus,
  deleteBanner,
  listBanners,
  getActiveBannersForUser,
  recordEvent,
  getBannerStats,
  VALID_TYPES,
  VALID_STATUS,
};

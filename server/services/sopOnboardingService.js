const db = require('../config/database');
const sopAcknowledgementService = require('./sopAcknowledgementService');
const { logAudit } = require('../utils/auditLogger');

async function getDefaultOnboardingSops(actorId) {
  let businessFilter = '';
  const params = [];

  if (actorId) {
    const [userRows] = await db.query(
      'SELECT business_id FROM users WHERE id = ? AND is_active = TRUE',
      [actorId]
    );
    const user = userRows[0];
    if (user && user.business_id) {
      businessFilter = 'AND s.business_id = ?';
      params.push(user.business_id);
    }
  }

  const [rows] = await db.query(`
    SELECT s.id AS sop_id, s.sop_code, s.title, s.status,
           v.id AS version_id, v.version
    FROM sops s
    JOIN sop_versions v ON v.sop_id = s.id AND v.is_current = 1
    WHERE s.is_default_onboarding = 1
      AND s.deleted_at IS NULL
      AND s.status = 'Published'
      AND v.status = 'Published'
      ${businessFilter}
    ORDER BY s.title ASC
  `, params);
  return rows;
}

async function assignOnboardingSopsToUser(userId, versionIds, actorId) {
  if (!versionIds || versionIds.length === 0) return { assigned: 0 };

  const values = versionIds.map(versionId => [versionId, userId, 'Pending']);
  const [result] = await db.query(
    `INSERT IGNORE INTO sop_acknowledgements (sop_version_id, user_id, status)
     VALUES ?`,
    [values]
  );

  if (result.affectedRows > 0) {
    logAudit({
      user_id: actorId || userId,
      action: 'onboarding.sops_assigned',
      entity_type: 'user',
      entity_id: userId,
      metadata: { count: result.affectedRows }
    });
  }

  return { assigned: result.affectedRows };
}

async function assignDefaultOnboardingSopsToUser(userId, actorId) {
  const defaultSops = await getDefaultOnboardingSops(actorId);
  if (defaultSops.length === 0) return { assigned: 0 };

  const versionIds = defaultSops.map(sop => sop.version_id);
  return assignOnboardingSopsToUser(userId, versionIds, actorId);
}

async function ensureOnboardingAcknowledgements(userId) {
  const [onboardingSops] = await db.query(`
    SELECT v.id AS version_id
    FROM sops s
    JOIN sop_versions v ON v.sop_id = s.id AND v.is_current = 1
    WHERE s.is_default_onboarding = 1
      AND s.deleted_at IS NULL
      AND v.status = 'Published'
  `);

  if (onboardingSops.length === 0) return;

  const [existing] = await db.query(`
    SELECT DISTINCT a.sop_version_id
    FROM sop_acknowledgements a
    JOIN sop_versions v ON v.id = a.sop_version_id
    WHERE a.user_id = ?
      AND a.status = 'Pending'
      AND v.is_current = 1
  `, [userId]);

  const existingVersionIds = new Set(existing.map((r) => r.sop_version_id));
  const missing = onboardingSops.filter((s) => !existingVersionIds.has(s.version_id));

  if (missing.length === 0) return;

  const values = missing.map((s) => [s.version_id, userId, 'Pending']);
  await db.query(
    `INSERT IGNORE INTO sop_acknowledgements (sop_version_id, user_id, status) VALUES ?`,
    [values]
  );
}

async function getPendingOnboardingSops(userId, actorId) {
  let businessFilter = '';
  const params = [userId];

  if (actorId) {
    const [userRows] = await db.query(
      'SELECT business_id FROM users WHERE id = ? AND is_active = TRUE',
      [actorId]
    );
    const actor = userRows[0];
    if (actor && actor.business_id) {
      businessFilter = 'AND s.business_id = ?';
      params.push(actor.business_id);
    }
  }

  const [rows] = await db.query(`
    SELECT a.id AS acknowledgement_id,
           s.id AS sop_id,
           s.sop_code,
           s.title,
           s.description,
           v.version,
           v.id AS version_id,
           a.status,
           a.acknowledged_at,
           a.created_at AS assigned_at,
           s.min_time_limit,
           m.id AS module_id,
           m.title AS module_title,
           m.content AS module_content,
           m.sort_order AS module_sort_order,
           m.time_limit AS module_time_limit,
           att.id AS attachment_id,
           att.file_name AS attachment_file_name,
           att.original_name AS attachment_original_name,
           att.mime_type AS attachment_mime_type,
           att.file_size AS attachment_file_size,
           att.file_extension AS attachment_file_extension,
           att.link_url AS attachment_link_url,
           att.download_count AS attachment_download_count
    FROM sops s
    JOIN sop_versions v ON v.sop_id = s.id AND v.is_current = 1
    LEFT JOIN sop_acknowledgements a ON a.sop_version_id = v.id AND a.user_id = ? AND a.status = 'Pending'
    LEFT JOIN sop_modules m ON m.sop_id = s.id AND m.sop_version_id = v.id AND (m.deleted_at IS NULL OR m.is_deleted = 0)
    LEFT JOIN sop_module_attachments att ON att.module_id = m.id AND att.is_deleted = FALSE
    WHERE s.is_default_onboarding = 1
      AND s.deleted_at IS NULL
      AND v.status = 'Published'
      AND (a.id IS NOT NULL OR NOT EXISTS (
        SELECT 1 FROM sop_acknowledgements a2
        WHERE a2.sop_version_id = v.id AND a2.user_id = ? AND a2.status != 'Pending' AND a2.is_deleted = FALSE
      ))
      ${businessFilter}
    ORDER BY a.created_at ASC, m.sort_order ASC, m.id ASC, att.created_at ASC
  `, [userId, userId, ...params.slice(1)]);

  // Group modules by SOP
  const sopsMap = new Map();
  for (const row of rows) {
    const key = row.acknowledgement_id || `sop_${row.sop_id}`;
    if (!sopsMap.has(key)) {
      sopsMap.set(key, {
        acknowledgement_id: row.acknowledgement_id,
        sop_id: row.sop_id,
        sop_code: row.sop_code,
        title: row.title,
        description: row.description,
        version: row.version,
        version_id: row.version_id,
        status: row.status,
        acknowledged_at: row.acknowledged_at,
        assigned_at: row.assigned_at,
        min_time_limit: row.min_time_limit || null,
        modules: [],
      });
    }
    if (row.module_id) {
      const existingModule = sopsMap.get(key).modules.find(
        (m) => m.id === row.module_id
      );
      if (existingModule) {
        if (row.attachment_id) {
          existingModule.attachments.push({
            id: row.attachment_id,
            file_name: row.attachment_file_name,
            original_name: row.attachment_original_name,
            mime_type: row.attachment_mime_type,
            file_size: row.attachment_file_size,
            file_extension: row.attachment_file_extension,
            link_url: row.attachment_link_url,
            download_count: row.attachment_download_count,
          });
        }
      } else {
        const moduleEntry = {
          id: row.module_id,
          title: row.module_title,
          content: row.module_content,
          sort_order: row.module_sort_order,
          time_limit: row.module_time_limit || null,
          attachments: [],
        };
        if (row.attachment_id) {
          moduleEntry.attachments.push({
            id: row.attachment_id,
            file_name: row.attachment_file_name,
            original_name: row.attachment_original_name,
            mime_type: row.attachment_mime_type,
            file_size: row.attachment_file_size,
            file_extension: row.attachment_file_extension,
            link_url: row.attachment_link_url,
            download_count: row.attachment_download_count,
          });
        }
        sopsMap.get(key).modules.push(moduleEntry);
      }
    }
  }

  return Array.from(sopsMap.values());
}

async function isOnboardingComplete(userId) {
  const [rows] = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM sops s
       JOIN sop_versions v ON v.sop_id = s.id AND v.is_current = 1
       WHERE s.is_default_onboarding = 1
         AND s.deleted_at IS NULL
         AND v.status = 'Published') AS total_onboarding,
      (SELECT COUNT(DISTINCT s.id) FROM sops s
       JOIN sop_versions v ON v.sop_id = s.id AND v.is_current = 1
       JOIN sop_acknowledgements a ON a.sop_version_id = v.id
         AND a.user_id = ? AND a.status != 'Pending' AND a.is_deleted = FALSE
       WHERE s.is_default_onboarding = 1
         AND s.deleted_at IS NULL
         AND v.status = 'Published') AS completed_onboarding
  `, [userId]);
  const total = rows[0]?.total_onboarding || 0;
  const completed = rows[0]?.completed_onboarding || 0;
  return total === 0 ? true : completed === total;
}

async function acknowledgeOnboardingSop(ackId, userId) {
  const [rows] = await db.query(
    `SELECT a.id, a.status, v.id AS version_id, s.min_time_limit
     FROM sop_acknowledgements a
     JOIN sop_versions v ON v.id = a.sop_version_id
     JOIN sops s ON s.id = v.sop_id
     WHERE a.id = ? AND a.user_id = ? AND a.status = 'Pending'
     FOR UPDATE`,
    [ackId, userId]
  );

  if (rows.length === 0) {
    const err = new Error('Onboarding SOP not found or already acknowledged');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const acknowledgement = rows[0];
  const minTime = acknowledgement.min_time_limit || null;

  if (minTime && minTime > 0) {
    const [sessionRows] = await db.query(
      `SELECT id, total_seconds, min_time_met
       FROM sop_onboarding_sessions
       WHERE user_id = ? AND sop_version_id = ? AND completed_at IS NULL
       ORDER BY id DESC LIMIT 1`,
      [userId, acknowledgement.version_id]
    );

    const session = sessionRows[0] || null;
    const met = session && (session.min_time_met === 1 || session.total_seconds >= minTime);

    if (!met) {
      const err = new Error(`Minimum completion time of ${minTime} seconds has not been met yet`);
      err.code = 'MIN_TIME_NOT_MET';
      throw err;
    }
  }

  await db.query(
    `UPDATE sop_acknowledgements
     SET status = 'Acknowledged', acknowledged_at = NOW()
     WHERE id = ?`,
    [ackId]
  );

  if (minTime && minTime > 0) {
    await db.query(
      `UPDATE sop_onboarding_sessions
       SET completed_at = NOW(), min_time_met = 1
       WHERE user_id = ? AND sop_version_id = ? AND completed_at IS NULL`,
      [userId, acknowledgement.version_id]
    );
  }

  logAudit({
    user_id: userId,
    action: 'onboarding.acknowledged',
    entity_type: 'sop_acknowledgement',
    entity_id: ackId
  });

  return { success: true };
}

module.exports = {
  getDefaultOnboardingSops,
  assignOnboardingSopsToUser,
  assignDefaultOnboardingSopsToUser,
  ensureOnboardingAcknowledgements,
  getPendingOnboardingSops,
  isOnboardingComplete,
  acknowledgeOnboardingSop,
};
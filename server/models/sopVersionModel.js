const db = require('../config/database');

// Real schema: sop_versions(id, public_id, sop_id, version, is_current,
// change_summary, effective_date, review_date, status, published_at,
// archived_at, created_by, created_at, deleted_at).
// All SOP content (sections, steps, documents, acknowledgements,
// assignments, change logs) is keyed off sop_version_id, not sop_id.
// These helpers resolve "the current version" so other models can
// keep accepting a plain sopId from routes.

async function getVersions(sopId) {
  const [rows] = await db.query(`
    SELECT *
    FROM sop_versions
    WHERE sop_id = ? AND deleted_at IS NULL
    ORDER BY created_at DESC, id DESC
  `, [sopId]);
  return rows;
}

async function getVersionById(id) {
  const [rows] = await db.query('SELECT * FROM sop_versions WHERE id = ? AND deleted_at IS NULL', [id]);
  return rows[0] || null;
}

async function getCurrentVersion(sopId) {
  const [rows] = await db.query(`
    SELECT * FROM sop_versions
    WHERE sop_id = ? AND is_current = TRUE AND deleted_at IS NULL
    LIMIT 1
  `, [sopId]);
  return rows[0] || null;
}

async function getCurrentVersionId(sopId) {
  const current = await getCurrentVersion(sopId);
  return current ? current.id : null;
}

// A SOP needs at least one version row before it can hold sections,
// steps, documents, etc. Creates a Draft "1.0" if none exists yet.
async function ensureCurrentVersion(sopId, actorId) {
  const existing = await getCurrentVersion(sopId);
  if (existing) return existing.id;

  return createVersion({
    sop_id: sopId,
    version: '1.0',
    status: 'Draft',
    created_by: actorId,
  }, { makeCurrent: true });
}

async function createVersion(data, { makeCurrent = false } = {}) {
  const {
    sop_id,
    version,
    change_summary,
    effective_date,
    review_date,
    status = 'Draft',
    created_by,
  } = data;

  if (makeCurrent) {
    await db.query('UPDATE sop_versions SET is_current = FALSE WHERE sop_id = ?', [sop_id]);
  }

  const [result] = await db.query(`
    INSERT INTO sop_versions (
      sop_id, version, is_current, change_summary, effective_date, review_date, status, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [sop_id, version || '1.0', makeCurrent ? 1 : 0, change_summary || null, effective_date || null, review_date || null, status, created_by || null]);

  const versionId = result.insertId;

  if (makeCurrent) {
    await db.query(
      'UPDATE sops SET current_version_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [versionId, status, sop_id],
    );
  }

  return versionId;
}

async function restoreVersion(sopId, versionId) {
  const version = await getVersionById(versionId);
  if (!version || version.sop_id !== sopId) return null;

  await db.query('UPDATE sop_versions SET is_current = FALSE WHERE sop_id = ?', [sopId]);
  await db.query('UPDATE sop_versions SET is_current = TRUE WHERE id = ?', [versionId]);
  await db.query(
    'UPDATE sops SET current_version_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [versionId, version.status, sopId],
  );

  return { restoredVersion: version };
}

function bumpVersion(currentVersion = '1.0') {
  const parts = String(currentVersion).split('.').map((part) => parseInt(part, 10) || 0);
  if (parts.length < 2) parts.push(0);
  if (parts[1] >= 9) {
    parts[0] += 1;
    parts[1] = 0;
  } else {
    parts[1] += 1;
  }
  return `${parts[0]}.${parts[1]}`;
}

module.exports = {
  getVersions,
  getVersionById,
  getCurrentVersion,
  getCurrentVersionId,
  ensureCurrentVersion,
  createVersion,
  restoreVersion,
  bumpVersion,
};
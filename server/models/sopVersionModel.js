const db = require('../config/database');

async function getVersions(sopId) {
  const [rows] = await db.query(`
    SELECT *
    FROM sop_versions
    WHERE sop_id = ?
    ORDER BY created_at DESC, id DESC
  `, [sopId]);
  return rows;
}

async function getVersionById(id) {
  const [rows] = await db.query('SELECT * FROM sop_versions WHERE id = ?', [id]);
  return rows[0] || null;
}

async function createVersion(data) {
  const {
    sop_id,
    version_number,
    title,
    description,
    content_snapshot,
    status,
    created_by,
    is_published = false,
  } = data;

  const [result] = await db.query(`
    INSERT INTO sop_versions (
      sop_id, version_number, title, description, content_snapshot, status, created_by, is_published, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [sop_id, version_number, title, description || null, content_snapshot ? JSON.stringify(content_snapshot) : null, status || 'Draft', created_by || null, is_published ? 1 : 0]);

  return result.insertId;
}

async function restoreVersion(sopId, versionId) {
  const version = await getVersionById(versionId);
  if (!version) return null;

  const nextVersion = bumpVersion(version.version_number || '1.0');
  const [result] = await db.query(`
    UPDATE sops
    SET version = ?, status = 'Draft', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [nextVersion, sopId]);

  if (result.affectedRows === 0) return null;
  return { restoredVersion: version, newVersion: nextVersion };
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
  createVersion,
  restoreVersion,
  bumpVersion,
};

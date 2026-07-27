const db = require('../config/database');
const acknowledgementService = require('../services/sopAcknowledgementService');
const { ensureCurrentVersion } = require('./sopVersionModel');

// Real schema: sop_change_logs(id, sop_version_id, field_name, old_value,
// new_value, changed_by, changed_at) — no `sop_id`, `action`, or `metadata`
// columns, and it's keyed off sop_version_id. sops.status is a denormalized
// mirror of the current version's status, so both get updated on transition.

async function transitionSop(sopId, nextStatus, actorId, metadata = {}) {
  const [rows] = await db.query('SELECT status FROM sops WHERE id = ? AND deleted_at IS NULL', [sopId]);
  const current = rows[0]?.status || 'Draft';
  const allowed = getAllowedTransitions(current);
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Invalid transition from ${current} to ${nextStatus}`);
  }

  const versionId = await ensureCurrentVersion(sopId, actorId);

  await db.query('UPDATE sops SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [nextStatus, sopId]);

  const versionSets = ['status = ?'];
  const versionParams = [nextStatus];
  if (nextStatus === 'Published') {
    versionSets.push('published_at = CURRENT_TIMESTAMP');
  }
  if (nextStatus === 'Archived') {
    versionSets.push('archived_at = CURRENT_TIMESTAMP');
  }
  versionParams.push(versionId);
  await db.query(`UPDATE sop_versions SET ${versionSets.join(', ')} WHERE id = ?`, versionParams);

  // NOTE: `metadata` is accepted for API-compatibility but there's no JSON
  // column left to persist it in on this table — only field_name/old_value/
  // new_value are stored.
  await db.query(`
    INSERT INTO sop_change_logs (sop_version_id, field_name, old_value, new_value, changed_by, changed_at)
    VALUES (?, 'status', ?, ?, ?, CURRENT_TIMESTAMP)
  `, [versionId, current, nextStatus, actorId || null]);

  let acknowledgements = null;
  if (nextStatus === 'Published') {
    acknowledgements = await acknowledgementService.generateAcknowledgementsOnPublish(sopId);
  }

  return { current, nextStatus, acknowledgements };
}

async function listChangeLogs(sopId) {
  const [rows] = await db.query(`
    SELECT scl.*, u.full_name AS user_name
    FROM sop_change_logs scl
    INNER JOIN sop_versions sv ON scl.sop_version_id = sv.id
    LEFT JOIN users u ON scl.changed_by = u.id
    WHERE sv.sop_id = ?
    ORDER BY scl.changed_at DESC
  `, [sopId]);
  return rows;
}

function getAllowedTransitions(currentStatus) {
  const transitions = {
    Draft: ['For Review'],
    'For Review': ['Draft', 'Approved'],
    Approved: ['Published'],
    Published: ['Archived'],
    Archived: [],
  };
  return transitions[currentStatus] || [];
}

module.exports = {
  transitionSop,
  listChangeLogs,
  getAllowedTransitions,
};
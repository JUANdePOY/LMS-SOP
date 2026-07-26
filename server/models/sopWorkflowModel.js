const db = require('../config/database');
const acknowledgementService = require('../services/sopAcknowledgementService');

async function transitionSop(sopId, nextStatus, actorId, metadata = {}) {
  const [rows] = await db.query('SELECT status FROM sops WHERE id = ? AND is_deleted = FALSE', [sopId]);
  const current = rows[0]?.status || 'Draft';
  const allowed = getAllowedTransitions(current);
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Invalid transition from ${current} to ${nextStatus}`);
  }

  const isPublished = nextStatus === 'Published';
  await db.query(
    'UPDATE sops SET status = ?, is_published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [nextStatus, isPublished ? 1 : 0, sopId],
  );
  await db.query(`
    INSERT INTO sop_change_logs (sop_id, changed_by, action, old_value, new_value, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [sopId, actorId, 'status.transition', current, nextStatus, JSON.stringify(metadata)]);

  let acknowledgements = null;
  if (isPublished) {
    acknowledgements = await acknowledgementService.generateAcknowledgementsOnPublish(sopId);
  }

  return { current, nextStatus, acknowledgements };
}

async function listChangeLogs(sopId) {
  const [rows] = await db.query(`
    SELECT scl.*, u.full_name AS user_name
    FROM sop_change_logs scl
    LEFT JOIN users u ON scl.changed_by = u.id
    WHERE scl.sop_id = ?
    ORDER BY scl.created_at DESC
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

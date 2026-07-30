const sopShareModel = require('../models/sopShareModel');
const sopModel = require('../models/sopModel');
const { logAudit } = require('../utils/auditLogger');

async function listShares(sopId) {
  return sopShareModel.listShares(sopId);
}

async function createShare(sopId, data, actorId) {
  const sop = await sopModel.findById(sopId);
  if (!sop) {
    const error = new Error('SOP not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const id = await sopShareModel.createShare({
    sop_id: sopId,
    share_type: data.share_type || 'internal',
    share_with: data.share_with || null,
    permissions: data.permissions || 'view',
    created_by: actorId,
  });

  logAudit({
    user_id: actorId,
    action: 'sop.share.created',
    entity_type: 'sop_share',
    entity_id: id,
    metadata: { sop_id: sopId },
  });

  return { id };
}

module.exports = {
  listShares,
  createShare,
};
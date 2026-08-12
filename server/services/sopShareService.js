const sopShareModel = require('../models/sopShareModel');
const sopModel = require('../models/sopModel');
const { logAudit } = require('../utils/auditLogger');
const sopService = require('./sopService');
const db = require('../config/database');

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

  const actor = await db.query(
    'SELECT id, role, business_id, department_id FROM users WHERE id = ?',
    [actorId]
  ).then(([rows]) => rows[0] || null);
  if (actor) {
    await sopService.enforceSopWriteScope(sop, actor);
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

async function createShareLink(sopId, data, user) {
  const sop = await sopModel.findById(sopId);
  if (!sop) {
    const error = new Error('SOP not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const actor = await db.query(
    'SELECT id, role, business_id, department_id FROM users WHERE id = ?',
    [user.id]
  ).then(([rows]) => rows[0] || null);
  if (actor) {
    await sopService.enforceSopWriteScope(sop, actor);
  }

  const { share_type, permissions, expires_at } = data;

  const result = await sopShareModel.createShareLink({
    sop_id: sopId,
    share_type,
    permissions: permissions || 'view',
    created_by: user.id,
    expires_at: expires_at || null,
  });

  logAudit({
    user_id: user.id,
    action: 'sop.share.link.created',
    entity_type: 'sop_share',
    entity_id: result.id,
    metadata: { sop_id: sopId, share_type, permissions },
  });

  return result;
}

async function getSharedSop(token, user) {
  const share = await sopShareModel.findByToken(token);
  if (!share) {
    const error = new Error('Share link not found or expired');
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (share.share_type === 'private') {
    if (!user) {
      const error = new Error('Sign in required to access this SOP');
      error.code = 'AUTH_REQUIRED';
      throw error;
    }

    const sop = await sopModel.findById(share.sop_id);
    if (!(await sopModel.canAccessSop(sop, user))) {
      const error = new Error('You do not have access to this SOP');
      error.code = 'FORBIDDEN';
      throw error;
    }
  }

  return share;
}

async function revokeShare(id, actorId) {
  const sop = await sopShareModel.findById(id);
  if (!sop) {
    const error = new Error('Share not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const sopRecord = await sopModel.findById(sop.sop_id);
  if (sopRecord) {
    const actor = await db.query(
      'SELECT id, role, business_id, department_id FROM users WHERE id = ?',
      [actorId]
    ).then(([rows]) => rows[0] || null);
    if (actor) {
      await sopService.enforceSopWriteScope(sopRecord, actor);
    }
  }

  await sopShareModel.revokeShare(id);
  logAudit({
    user_id: actorId,
    action: 'sop.share.link.revoked',
    entity_type: 'sop_share',
    entity_id: id,
  });
  return { id };
}

module.exports = {
  listShares,
  createShare,
  createShareLink,
  getSharedSop,
  revokeShare,
};
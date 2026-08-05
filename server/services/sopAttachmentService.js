const crypto = require('crypto');
const sopModuleAttachmentModel = require('../models/sopModuleAttachmentModel');
const sopModuleModel = require('../models/sopModuleModel');
const sopVersionModel = require('../models/sopVersionModel');
const { logAudit } = require('../utils/auditLogger');
const sopAuditLogService = require('./sopAuditLogService');

async function listAttachments(moduleId, versionId = null) {
  return sopModuleAttachmentModel.listByModule(moduleId, versionId);
}

async function getAttachmentById(attachmentId) {
  const attachment = await sopModuleAttachmentModel.getById(attachmentId);
  if (!attachment) {
    const error = new Error('Attachment not found');
    error.code = 'NOT_FOUND';
    throw error;
  }
  return attachment;
}

/**
 * Validates a URL string and returns it if valid, or throws an error.
 */
function validateLinkUrl(linkUrl) {
  if (!linkUrl || typeof linkUrl !== 'string' || !linkUrl.trim()) {
    const error = new Error('Link URL is required');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const trimmedUrl = linkUrl.trim();
  
  // Basic URL validation - must be a valid HTTP/HTTPS URL
  try {
    const url = new URL(trimmedUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      const error = new Error('Link URL must be a valid HTTP or HTTPS URL');
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
  } catch (e) {
    const error = new Error('Invalid URL format');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  return trimmedUrl;
}

// ---------------------------------------------------------------------------
// Signed view tokens
//
// Inline <img> tags can't send an Authorization header, and this route needs
// to stay reachable indefinitely (a pasted screenshot from months ago still
// needs to render). So instead of gating it with the normal JWT middleware,
// each attachment gets an HMAC signature scoped ONLY to "may view attachment
// <id>" — it grants no other access, can't be forged without the server
// secret, and doesn't expire. Requires ATTACHMENT_VIEW_SECRET (falls back to
// JWT_SECRET if you already have one) set in the environment.
// ---------------------------------------------------------------------------

function getViewSecret() {
  const secret = process.env.ATTACHMENT_VIEW_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('ATTACHMENT_VIEW_SECRET (or JWT_SECRET) must be set to serve inline attachment images');
  }
  return secret;
}

function signAttachmentToken(attachmentId) {
  return crypto.createHmac('sha256', getViewSecret()).update(String(attachmentId)).digest('hex');
}

function verifyAttachmentToken(attachmentId, token) {
  if (!token) return false;
  const expected = signAttachmentToken(attachmentId);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(token));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Relative URL an <img>/<a> can use directly — no auth header required. */
function buildViewUrl(attachmentId, req) {
  const path = `/api/sops/attachments/${attachmentId}/file?token=${signAttachmentToken(attachmentId)}`;
  if (!req) return path;
  const protocol = req.get('x-forwarded-proto')?.split(',')[0].trim() || req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}${path}`;
}

/**
 * Used by the unauthenticated file-serving route (see sopAttachmentPublicFile.js).
 * Throws NOT_FOUND for missing/deleted attachments or a bad token, so the
 * route can respond 404 either way without leaking which case it was.
 */
async function getAttachmentFileForView(attachmentId, token) {
  if (!verifyAttachmentToken(attachmentId, token)) {
    const error = new Error('Attachment not found');
    error.code = 'NOT_FOUND';
    throw error;
  }
  const attachment = await sopModuleAttachmentModel.getById(attachmentId);
  if (!attachment || attachment.is_deleted) {
    const error = new Error('Attachment not found');
    error.code = 'NOT_FOUND';
    throw error;
  }
  // NOTE: if listByModule/getById in sopModuleAttachmentModel excludes the
  // file_data BLOB column for list-view performance, add a dedicated
  // getFileDataById(attachmentId) there and call it here instead.
  if (!attachment.file_data) {
    const error = new Error('Attachment has no stored file data (is it a link attachment?)');
    error.code = 'NOT_FOUND';
    throw error;
  }
  return attachment;
}

async function uploadAttachment(moduleId, data, actorId, req) {
  const { file_name, original_name, mime_type, file_size, file_extension, file_data } = data;

  const module = await sopModuleModel.getModuleById(moduleId);
  if (!module) {
    const error = new Error('Module not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  // Get the version associated with this module (if any)
  const moduleVersionId = module.sop_version_id || await sopVersionModel.getCurrentVersionId(module.sop_id);

  const id = await sopModuleAttachmentModel.createAttachment({
    module_id: moduleId,
    file_name,
    original_name,
    mime_type,
    file_size,
    file_extension,
    file_data,
    uploaded_by: actorId,
    sop_version_id: moduleVersionId,
  });

  logAudit({
    user_id: actorId,
    action: 'sop.module.attachment.uploaded',
    entity_type: 'sop_module_attachment',
    entity_id: id,
    metadata: { module_id: moduleId, sop_id: module.sop_id, sop_version_id: moduleVersionId },
  });

  sopAuditLogService.logEntry({
    entity_type: 'sop',
    entity_id: module.sop_id,
    action: 'sop.module.attachment.uploaded',
    performed_by: actorId,
    new_values: { attachment_id: id, file_name, module_id: moduleId, sop_version_id: moduleVersionId },
  });

  // view_url is what the frontend rich-text editor uses as the <img src>
  // for pasted/dropped/uploaded images — see imageUploadHelpers.js.
  return { id, view_url: buildViewUrl(id, req) };
}

async function createLink(moduleId, data, actorId) {
  const { link_url, link_title } = data;

  const module = await sopModuleModel.getModuleById(moduleId);
  if (!module) {
    const error = new Error('Module not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const moduleVersionId = module.sop_version_id || await sopVersionModel.getCurrentVersionId(module.sop_id);

  const validatedUrl = validateLinkUrl(link_url);

  const id = await sopModuleAttachmentModel.createAttachment({
    module_id: moduleId,
    link_url: validatedUrl,
    original_name: link_title,
    uploaded_by: actorId,
    sop_version_id: moduleVersionId,
  });

  logAudit({
    user_id: actorId,
    action: 'sop.module.attachment.link_created',
    entity_type: 'sop_module_attachment',
    entity_id: id,
    metadata: { module_id: moduleId, sop_id: module.sop_id, sop_version_id: moduleVersionId },
  });

  sopAuditLogService.logEntry({
    entity_type: 'sop',
    entity_id: module.sop_id,
    action: 'sop.module.attachment.link_created',
    performed_by: actorId,
    new_values: { attachment_id: id, link_url: validatedUrl, module_id: moduleId, sop_version_id: moduleVersionId },
  });

  return { id, sop_version_id: moduleVersionId };
}

async function deleteAttachment(attachmentId, actorId) {
  const attachment = await sopModuleAttachmentModel.getById(attachmentId);
  if (!attachment) {
    const error = new Error('Attachment not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  await sopModuleAttachmentModel.softDeleteAttachment(attachmentId);

  logAudit({
    user_id: actorId,
    action: 'sop.module.attachment.deleted',
    entity_type: 'sop_module_attachment',
    entity_id: attachmentId,
    metadata: { module_id: attachment.module_id, sop_id: attachment.sop_id },
  });

  sopAuditLogService.logEntry({
    entity_type: 'sop',
    entity_id: attachment.sop_id,
    action: 'sop.module.attachment.deleted',
    performed_by: actorId,
    old_values: { attachment_id: attachmentId, file_name: attachment.file_name },
    new_values: { is_deleted: true },
  });

  return { affectedRows: 1 };
}

async function restoreAttachment(attachmentId, actorId) {
  const attachment = await sopModuleAttachmentModel.getByIdIncludingDeleted(attachmentId);
  if (!attachment) {
    const error = new Error('Attachment not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  await sopModuleAttachmentModel.restoreAttachment(attachmentId);

  logAudit({
    user_id: actorId,
    action: 'sop.module.attachment.restored',
    entity_type: 'sop_module_attachment',
    entity_id: attachmentId,
    metadata: { module_id: attachment.module_id, sop_id: attachment.sop_id },
  });

  sopAuditLogService.logEntry({
    entity_type: 'sop',
    entity_id: attachment.sop_id,
    action: 'sop.module.attachment.restored',
    performed_by: actorId,
    old_values: { is_deleted: true },
    new_values: { is_deleted: false },
  });

  return { affectedRows: 1 };
}

async function permanentDeleteAttachment(attachmentId, actorId) {
  const attachment = await sopModuleAttachmentModel.getByIdIncludingDeleted(attachmentId);
  if (!attachment) {
    const error = new Error('Attachment not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  await sopModuleAttachmentModel.permanentDeleteAttachment(attachmentId);

  logAudit({
    user_id: actorId,
    action: 'sop.module.attachment.permanently_deleted',
    entity_type: 'sop_module_attachment',
    entity_id: attachmentId,
    metadata: { module_id: attachment.module_id, sop_id: attachment.sop_id },
  });

  sopAuditLogService.logEntry({
    entity_type: 'sop',
    entity_id: attachment.sop_id,
    action: 'sop.module.attachment.permanently_deleted',
    performed_by: actorId,
    new_values: { permanently_deleted: true },
  });

  return { affectedRows: 1 };
}

async function listTrashedAttachments(moduleId) {
  return sopModuleAttachmentModel.listTrashedAttachments(moduleId);
}

async function incrementDownload(attachmentId) {
  return sopModuleAttachmentModel.incrementDownloadCount(attachmentId);
}

module.exports = {
  listAttachments,
  getAttachmentById,
  uploadAttachment,
  createLink,
  deleteAttachment,
  restoreAttachment,
  permanentDeleteAttachment,
  listTrashedAttachments,
  incrementDownload,
  // new — used by the public file-view route
  buildViewUrl,
  getAttachmentFileForView,
};

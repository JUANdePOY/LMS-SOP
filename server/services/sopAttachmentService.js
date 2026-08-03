const sopModuleAttachmentModel = require('../models/sopModuleAttachmentModel');
const sopModuleModel = require('../models/sopModuleModel');
const { logAudit } = require('../utils/auditLogger');
const sopAuditLogService = require('./sopAuditLogService');

async function listAttachments(moduleId) {
  return sopModuleAttachmentModel.listByModule(moduleId);
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

async function uploadAttachment(moduleId, data, actorId) {
  const { file_name, original_name, mime_type, file_size, file_extension, file_data } = data;

  const module = await sopModuleModel.getModuleById(moduleId);
  if (!module) {
    const error = new Error('Module not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const id = await sopModuleAttachmentModel.createAttachment({
    module_id: moduleId,
    file_name,
    original_name,
    mime_type,
    file_size,
    file_extension,
    file_data,
    uploaded_by: actorId,
  });

  logAudit({
    user_id: actorId,
    action: 'sop.module.attachment.uploaded',
    entity_type: 'sop_module_attachment',
    entity_id: id,
    metadata: { module_id: moduleId, sop_id: module.sop_id },
  });

  sopAuditLogService.logEntry({
    entity_type: 'sop',
    entity_id: module.sop_id,
    action: 'sop.module.attachment.uploaded',
    performed_by: actorId,
    new_values: { attachment_id: id, file_name, module_id: moduleId },
  });

  return { id };
}

async function createLink(moduleId, data, actorId) {
  const { link_url, link_title } = data;

  const module = await sopModuleModel.getModuleById(moduleId);
  if (!module) {
    const error = new Error('Module not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const validatedUrl = validateLinkUrl(link_url);

  const id = await sopModuleAttachmentModel.createAttachment({
    module_id: moduleId,
    link_url: validatedUrl,
    original_name: link_title,
    uploaded_by: actorId,
  });

  logAudit({
    user_id: actorId,
    action: 'sop.module.attachment.link_created',
    entity_type: 'sop_module_attachment',
    entity_id: id,
    metadata: { module_id: moduleId, sop_id: module.sop_id },
  });

  sopAuditLogService.logEntry({
    entity_type: 'sop',
    entity_id: module.sop_id,
    action: 'sop.module.attachment.link_created',
    performed_by: actorId,
    new_values: { attachment_id: id, link_url: validatedUrl, module_id: moduleId },
  });

  return { id };
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
};

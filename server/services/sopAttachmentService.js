const sopModuleAttachmentModel = require('../models/sopModuleAttachmentModel');
const sopModuleModel = require('../models/sopModuleModel');
const { logAudit } = require('../utils/auditLogger');

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
    metadata: { module_id: moduleId },
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
    metadata: { module_id: attachment.module_id },
  });

  return { affectedRows: 1 };
}

async function restoreAttachment(attachmentId, actorId) {
  const attachment = await sopModuleAttachmentModel.getById(attachmentId);
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
    metadata: { module_id: attachment.module_id },
  });

  return { affectedRows: 1 };
}

async function permanentDeleteAttachment(attachmentId, actorId) {
  const attachment = await sopModuleAttachmentModel.getById(attachmentId);
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
    metadata: { module_id: attachment.module_id },
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
  deleteAttachment,
  restoreAttachment,
  permanentDeleteAttachment,
  listTrashedAttachments,
  incrementDownload,
};

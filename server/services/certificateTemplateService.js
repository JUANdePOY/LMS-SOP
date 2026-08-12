const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const certificateTemplateModel = require('../models/certificateTemplateModel');
const { normalizeSections } = require('../shared/certificateSections');
const { logAudit } = require('../utils/auditLogger');
const { validateTemplatePayload, validateSectionsPayload } = require('../validators/certificateTemplateValidator');
const {
  certificateRoot,
  certificateTemplateDir,
  absolutePathFromRelative,
} = require('../config/uploads');
const storage = require('../config/storage');

async function ensureUploadRoot() {
  await fs.mkdir(certificateRoot(), { recursive: true });
}

async function saveFrameFile(file, publicId, ext) {
  if (!file || !file.buffer) {
    const error = new Error('Frame file buffer is required');
    error.code = 'UPLOAD_ERROR';
    throw error;
  }

  const dir = certificateTemplateDir(publicId);
  const relativePath = path.posix.join('certificates', 'templates', publicId, `frame-${crypto.randomUUID()}${ext}`);

  if (storage.isS3()) {
    const url = await storage.saveFile({
      buffer: file.buffer,
      dir: path.posix.join('certificates', 'templates', publicId),
      filename: `frame-${crypto.randomUUID()}${ext}`,
      contentType: file.mimetype,
    });
    return {
      filename: path.basename(relativePath),
      storage_path: url,
    };
  }

  await fs.mkdir(dir, { recursive: true });
  const absPath = path.join(dir, `frame-${crypto.randomUUID()}${ext}`);
  await fs.writeFile(absPath, file.buffer);

  return {
    filename: path.basename(absPath),
    storage_path: relativePath,
  };
}

async function removeFrameFile(storagePath) {
  if (!storagePath) return;
  if (storage.isS3() || storage.isExternalUrl(storagePath)) {
    await storage.deleteFile(storagePath).catch(() => {});
    return;
  }
  const abs = absolutePathFromRelative(storagePath);
  if (abs) {
    try {
      await fs.unlink(abs);
    } catch {
      // file may already be gone
    }
  }
}

async function listTemplates(filters = {}) {
  return certificateTemplateModel.findAll(filters);
}

async function getTemplate(identifier) {
  const template = await certificateTemplateModel.findByIdentifier(identifier);
  if (!template) {
    const error = new Error('Certificate template not found');
    error.code = 'NOT_FOUND';
    throw error;
  }
  return template;
}

async function getTemplateFrame(identifier) {
  const template = await certificateTemplateModel.findByIdentifier(identifier);
  if (!template) {
    const error = new Error('Certificate template not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (template.frame_data) {
    return {
      buffer: template.frame_data,
      mime: template.frame_mime_type || 'application/octet-stream',
      filename: template.frame_filename || template.frame_original_name || null,
    };
  }

  if (template.frame_storage_path) {
    if (storage.isS3() || storage.isExternalUrl(template.frame_storage_path)) {
      const buf = await storage.readFile(template.frame_storage_path);
      if (buf) {
        const ext = path.extname(template.frame_filename || template.frame_original_name || '').toLowerCase();
        const mime = template.frame_mime_type || (ext === '.png' ? 'image/png' : (ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream'));
        return { buffer: buf, mime, filename: template.frame_filename || template.frame_original_name || null };
      }
    } else {
      const abs = absolutePathFromRelative(template.frame_storage_path);
      if (abs) {
        try {
          const buf = await fs.readFile(abs);
          const ext = path.extname(template.frame_filename || template.frame_original_name || '').toLowerCase();
          const mime = template.frame_mime_type || (ext === '.png' ? 'image/png' : (ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream'));
          return { buffer: buf, mime, filename: template.frame_filename || template.frame_original_name || null };
        } catch (err) {
          // fall through to not found
        }
      }
    }
  }

  const error = new Error('Frame not found');
  error.code = 'NOT_FOUND';
  throw error;
}

async function createTemplate(body, file, actorId) {
  const fieldValidation = validateTemplatePayload(body);
  if (!fieldValidation.valid) {
    const error = new Error('Validation failed');
    error.code = 'VALIDATION_ERROR';
    error.details = fieldValidation.errors;
    throw error;
  }

  const sectionsValidation = validateSectionsPayload(body.sections);
  if (!sectionsValidation.valid) {
    const error = new Error('Sections validation failed');
    error.code = 'VALIDATION_ERROR';
    error.details = sectionsValidation.errors;
    throw error;
  }

  if (!file) {
    const error = new Error('Frame image file is required');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  await ensureUploadRoot();

  const publicId = crypto.randomUUID();
  const ext = path.extname(file.originalname || '').toLowerCase();

  const { filename, storage_path } = await saveFrameFile(file, publicId, ext);

  const normalizedSections = sectionsValidation.value;

  const templateId = await certificateTemplateModel.create({
    public_id: publicId,
    name: fieldValidation.value.name,
    department_id: fieldValidation.value.department_id,
    frame_filename: filename,
    frame_storage_path: storage_path,
    frame_data: file.buffer,
    frame_mime_type: file.mimetype,
    frame_size: file.size,
    frame_original_name: file.originalname,
    orientation: fieldValidation.value.orientation || 'landscape',
    width_px: fieldValidation.value.width_px,
    height_px: fieldValidation.value.height_px,
    sections: normalizedSections,
    status: fieldValidation.value.status || 'draft',
    created_by: actorId,
  });

  logAudit({
    user_id: actorId,
    action: 'certificate.template.created',
    entity_type: 'certificate_template',
    entity_id: templateId,
    metadata: { public_id: publicId, name: fieldValidation.value.name },
  });

  return await certificateTemplateModel.findById(templateId);
}

async function updateTemplate(identifier, body, file, actorId) {
  const existing = await getTemplate(identifier);

  const fieldValidation = validateTemplatePayload(body, { isCreate: false });
  if (!fieldValidation.valid) {
    const error = new Error('Validation failed');
    error.code = 'VALIDATION_ERROR';
    error.details = fieldValidation.errors;
    throw error;
  }

  // Parse + normalize once here, and reuse the result below — do NOT call
  // normalizeSections(body.sections) again afterward, since body.sections
  // is still the raw JSON *string* at that point, not an object. Doing so
  // silently produces an all-defaults sections object (every field falls
  // back to '' / default), which is what was causing saved templates to
  // "revert to default" and PDFs to render with only the frame image.
  let normalizedSections;
  if (body.sections !== undefined) {
    const sectionsValidation = validateSectionsPayload(body.sections);
    if (!sectionsValidation.valid) {
      const error = new Error('Sections validation failed');
      error.code = 'VALIDATION_ERROR';
      error.details = sectionsValidation.errors;
      throw error;
    }
    normalizedSections = sectionsValidation.value;
  }

  let frameFilename = existing.frame_filename;
  let frameStoragePath = existing.frame_storage_path;

  if (file) {
    await removeFrameFile(existing.frame_storage_path);
    const ext = path.extname(file.originalname || '').toLowerCase();
    const { filename, storage_path } = await saveFrameFile(file, existing.public_id, ext);
    frameFilename = filename;
    frameStoragePath = storage_path;
  }

  const updates = { ...fieldValidation.value };
  if (normalizedSections !== undefined) {
    updates.sections = normalizedSections;
  }
  if (frameFilename !== existing.frame_filename) {
    updates.frame_filename = frameFilename;
    updates.frame_storage_path = frameStoragePath;
  }
  if (file) {
    updates.frame_data = file.buffer;
    updates.frame_mime_type = file.mimetype;
    updates.frame_size = file.size;
    updates.frame_original_name = file.originalname;
  }
  updates.updated_by = actorId;

  await certificateTemplateModel.update(existing.id, updates);

  logAudit({
    user_id: actorId,
    action: 'certificate.template.updated',
    entity_type: 'certificate_template',
    entity_id: existing.id,
    metadata: { public_id: existing.public_id },
  });

  return await certificateTemplateModel.findById(existing.id);
}

async function deleteTemplate(identifier, actorId) {
  const existing = await getTemplate(identifier);

  await removeFrameFile(existing.frame_storage_path);

  await certificateTemplateModel.softDelete(existing.id);

  logAudit({
    user_id: actorId,
    action: 'certificate.template.deleted',
    entity_type: 'certificate_template',
    entity_id: existing.id,
    metadata: { public_id: existing.public_id, name: existing.name },
  });

  return { affectedRows: 1 };
}

async function getTemplateStats() {
  return certificateTemplateModel.getStats();
}

module.exports = {
  ensureUploadRoot,
  saveFrameFile,
  removeFrameFile,
  listTemplates,
  getTemplate,
  getTemplateFrame,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplateStats,
};
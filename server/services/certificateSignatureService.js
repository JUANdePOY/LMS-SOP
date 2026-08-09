const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const certificateSignatureModel = require('../models/certificateSignatureModel');
const { logAudit } = require('../utils/auditLogger');
const { validateSignaturePayload } = require('../validators/certificateSignatureValidator');
const {
  certificateRoot,
  absolutePathFromRelative,
} = require('../config/uploads');
const storage = require('../config/storage');

// Minimal 120x48 gray PNG placeholder used when a signature is
// soft-deleted or hard-deleted but still referenced by a template
// signatures_seal items, so the preview and PDF rendering dont break.
const PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAIAAAAAYCAYAAAAVjKmxAAABp0lEQVR4nO3BMQEAAADCoPVP7WsIoAAAAAAAA',
  'base64'
);

async function saveSignatureFile(file) {
  if (!file || !file.buffer) {
    const error = new Error('Signature image buffer is required');
    error.code = 'UPLOAD_ERROR';
    throw error;
  }

  const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
  const filename = `signature-${crypto.randomUUID()}${ext}`;
  const relativePath = path.posix.join('certificates', 'signatures', filename);

  if (storage.isS3()) {
    const url = await storage.saveFile({
      buffer: file.buffer,
      dir: 'certificates/signatures',
      filename,
      contentType: file.mimetype,
    });
    return { filename, storage_path: url };
  }

  const dir = path.join(certificateRoot(), 'signatures');
  await fs.mkdir(dir, { recursive: true });
  const absPath = path.join(dir, filename);
  await fs.writeFile(absPath, file.buffer);

  return { filename, storage_path: relativePath };
}

async function removeSignatureFile(storagePath) {
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

async function getSignatureImage(id) {
  let signature;
  try {
    signature = await getSignature(id);
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return {
        buffer: PLACEHOLDER_PNG,
        mime: 'image/png',
        filename: 'placeholder.png',
      };
    }
    throw err;
  }
  if (!signature) {
    return {
      buffer: PLACEHOLDER_PNG,
      mime: 'image/png',
      filename: 'placeholder.png',
    };
  }

  if (signature.signature_data) {
    const mime = signature.signature_mime_type || 'application/octet-stream';
    return {
      buffer: signature.signature_data,
      mime,
      filename: signature.signature_original_name || signature.filename || 'signature.png',
    };
  }

  if (!signature.storage_path) {
    const error = new Error('Signature image not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (storage.isS3() || storage.isExternalUrl(signature.storage_path)) {
    const buffer = await storage.readFile(signature.storage_path);
    if (!buffer) {
      const error = new Error('Signature image not found');
      error.code = 'NOT_FOUND';
      throw error;
    }
    const ext = path.extname(signature.filename || signature.storage_path || '').toLowerCase();
    const mime = signature.signature_mime_type || (ext === '.png' ? 'image/png' : (ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream'));
    return { buffer, mime, filename: signature.filename || path.basename(signature.storage_path) };
  }

  const absPath = absolutePathFromRelative(signature.storage_path);
  if (!absPath) {
    const error = new Error('Invalid signature storage path');
    error.code = 'NOT_FOUND';
    throw error;
  }
  try {
    const buffer = await fs.readFile(absPath);
    const ext = path.extname(signature.filename || signature.storage_path || '').toLowerCase();
    const mime = signature.signature_mime_type || (ext === '.png' ? 'image/png' : (ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream'));
    return { buffer, mime, filename: signature.filename || path.basename(signature.storage_path) };
  } catch (err) {
    const error = new Error('Signature image not found');
    error.code = 'NOT_FOUND';
    throw error;
  }
}

async function listSignatures(filters = {}) {
  return certificateSignatureModel.findAll(filters);
}

async function getSignature(id) {
  const sig = await certificateSignatureModel.findById(id);
  if (!sig) {
    const error = new Error('Certificate signature not found');
    error.code = 'NOT_FOUND';
    throw error;
  }
  return sig;
}

async function createSignature(file, body, actorId) {
  const validation = validateSignaturePayload(body);
  if (!validation.valid) {
    const error = new Error('Validation failed');
    error.code = 'VALIDATION_ERROR';
    error.details = validation.errors;
    throw error;
  }

  if (!file) {
    const error = new Error('Signature image file is required');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const { filename, storage_path } = await saveSignatureFile(file);

  const signatureId = await certificateSignatureModel.create({
    ...validation.value,
    filename,
    storage_path,
    signature_data: file.buffer,
    signature_mime_type: file.mimetype,
    signature_size: file.size,
    signature_original_name: file.originalname,
  });

  logAudit({
    user_id: actorId,
    action: 'certificate.signature.uploaded',
    entity_type: 'certificate_signature',
    entity_id: signatureId,
    metadata: { label: validation.value.label, type: validation.value.type },
  });

  return await certificateSignatureModel.findById(signatureId);
}

async function updateSignature(id, body, actorId) {
  const existing = await getSignature(id);

  const validation = validateSignaturePayload({ ...existing, ...body });
  if (!validation.valid) {
    const error = new Error('Validation failed');
    error.code = 'VALIDATION_ERROR';
    error.details = validation.errors;
    throw error;
  }

  const updates = {};
  if (validation.value.label !== undefined) updates.label = validation.value.label;
  if (validation.value.type !== undefined) updates.type = validation.value.type;
  if (validation.value.is_default !== undefined) updates.is_default = validation.value.is_default ? 1 : 0;
  if (validation.value.user_id !== undefined) updates.user_id = validation.value.user_id || null;

  if (Object.keys(updates).length === 0) {
    const error = new Error('No changes provided');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  await certificateSignatureModel.update(id, updates);

  logAudit({
    user_id: actorId,
    action: 'certificate.signature.updated',
    entity_type: 'certificate_signature',
    entity_id: id,
    metadata: updates,
  });

  return await certificateSignatureModel.findById(id);
}

async function deleteSignature(id, actorId) {
  const existing = await getSignature(id);

  await removeSignatureFile(existing.storage_path);
  await certificateSignatureModel.softDelete(id);

  logAudit({
    user_id: actorId,
    action: 'certificate.signature.deleted',
    entity_type: 'certificate_signature',
    entity_id: id,
    metadata: { label: existing.label, type: existing.type },
  });

  return { affectedRows: 1 };
}

async function resolveSignatures(signatureIds) {
  if (!signatureIds || signatureIds.length === 0) return [];

  const db = require('../config/database');
  const placeholders = signatureIds.map(() => '?').join(', ');
  const [rows] = await db.query(
    `SELECT id, user_id, label, type, filename, storage_path, is_default
     FROM certificate_signatures
     WHERE id IN (${placeholders}) AND is_deleted = 0`,
    signatureIds
  );
  return rows;
}

module.exports = {
  removeSignatureFile,
  getSignatureImage,
  listSignatures,
  getSignature,
  createSignature,
  updateSignature,
  deleteSignature,
  resolveSignatures,
};

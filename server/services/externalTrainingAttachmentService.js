const fs = require('fs/promises');
const path = require('path');
const externalTrainingModel = require('../models/externalTrainingModel');
const attachmentModel = require('../models/externalTrainingAttachmentModel');
const {
  isAllowedMime,
  safeExtFromOriginal,
  externalTrainingDir,
  absolutePathFromRelative,
} = require('../config/uploads');
const trainingModel = require('../models/trainingModel');

function mapPublicRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    kind: row.kind,
    original_filename: row.original_filename,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    created_at: row.created_at,
  };
}

async function listPublicForExternalTraining(externalTrainingId) {
  try {
    const rows = await attachmentModel.listByExternalTrainingId(externalTrainingId);
    return rows.map(mapPublicRow);
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE' || e.errno === 1146) {
      return [];
    }
    throw e;
  }
}

async function unlinkQuiet(absPath) {
  try {
    await fs.unlink(absPath);
  } catch (_) {}
}

async function unlinkRelativePaths(relativePaths) {
  for (const rel of relativePaths) {
    const abs = absolutePathFromRelative(rel);
    if (abs) await unlinkQuiet(abs);
  }
}

async function registerLetterOrderUpload(externalTrainingId, file, userId) {
  const training = await externalTrainingModel.findExternalById(externalTrainingId);
  if (!training) {
    const err = new Error('Training not found');
    err.statusCode = 404;
    throw err;
  }

  if (!file || !file.path || !file.filename) {
    const err = new Error('No file uploaded');
    err.statusCode = 400;
    throw err;
  }

  const mime = String(file.mimetype || '').toLowerCase();
  if (!isAllowedMime(mime)) {
    const err = new Error('Only PDF, JPEG, and PNG files are allowed');
    err.statusCode = 400;
    throw err;
  }

  const ext = safeExtFromOriginal(file.originalname);
  if (!ext) {
    const err = new Error('Invalid file extension');
    err.statusCode = 400;
    throw err;
  }

  const relativePath = path.join('external-trainings', String(externalTrainingId), file.filename).replace(/\\/g, '/');
  const absNew = absolutePathFromRelative(relativePath);
  const resolvedFile = path.resolve(file.path);
  const trainingAbsDir = path.resolve(externalTrainingDir(externalTrainingId));
  const relFromDir = path.relative(trainingAbsDir, resolvedFile);
  if (
    !absNew ||
    relFromDir.startsWith('..') ||
    path.isAbsolute(relFromDir) ||
    relFromDir !== file.filename
  ) {
    const err = new Error('Invalid upload path');
    err.statusCode = 400;
    throw err;
  }

  const conn = await trainingModel.getConnection();
  let oldPaths = [];
  let insertId;
  try {
    const [existing] = await conn.query(
      `SELECT relative_path FROM external_training_attachments WHERE external_training_id = ? AND kind = ?`,
      [externalTrainingId, attachmentModel.KIND_LETTER_ORDER]
    );
    oldPaths = existing.map((r) => r.relative_path);

    await conn.beginTransaction();
    await attachmentModel.deleteByExternalTrainingAndKind(conn, externalTrainingId, attachmentModel.KIND_LETTER_ORDER);
    insertId = await attachmentModel.insert(conn, {
      external_training_id: externalTrainingId,
      kind: attachmentModel.KIND_LETTER_ORDER,
      stored_filename: file.filename,
      original_filename: String(file.originalname || 'document').slice(0, 500),
      mime_type: mime,
      size_bytes: file.size || 0,
      storage_backend: 'local',
      relative_path: relativePath,
      uploaded_by: userId ?? null,
    });
    await conn.commit();
  } catch (e) {
    await conn.rollback().catch(() => {});
    await unlinkQuiet(file.path);
    throw e;
  } finally {
    conn.release();
  }

  await unlinkRelativePaths(oldPaths);
  const row = await attachmentModel.findByIdForExternalTraining(insertId, externalTrainingId);
  return mapPublicRow(row);
}

async function getDownloadStreamContext(attachmentId, externalTrainingId) {
  const row = await attachmentModel.findByIdForExternalTraining(attachmentId, externalTrainingId);
  if (!row) {
    const err = new Error('Attachment not found');
    err.statusCode = 404;
    throw err;
  }
  const abs = absolutePathFromRelative(row.relative_path);
  if (!abs) {
    const err = new Error('Invalid attachment path');
    err.statusCode = 400;
    throw err;
  }
  try {
    await fs.access(abs);
  } catch {
    const err = new Error('File missing on disk');
    err.statusCode = 404;
    throw err;
  }
  return {
    absolutePath: abs,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
  };
}

async function removeAllFilesForExternalTraining(externalTrainingId) {
  let paths = [];
  try {
    paths = await attachmentModel.listAllRelativePathsForExternalTraining(externalTrainingId);
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE' || e.errno === 1146) {
      return;
    }
    throw e;
  }
  await unlinkRelativePaths(paths);
}

/** Remove a single attachment: deletes its DB row and unlinks the file from disk. */
async function deleteAttachment(attachmentId, externalTrainingId) {
  const row = await attachmentModel.findByIdForExternalTraining(attachmentId, externalTrainingId);
  if (!row) {
    const err = new Error('Attachment not found');
    err.statusCode = 404;
    throw err;
  }

  const conn = await trainingModel.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `DELETE FROM external_training_attachments WHERE id = ? AND external_training_id = ?`,
      [attachmentId, externalTrainingId]
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback().catch(() => {});
    throw e;
  } finally {
    conn.release();
  }

  const abs = absolutePathFromRelative(row.relative_path);
  if (abs) await unlinkQuiet(abs);

  return { id: attachmentId };
}

module.exports = {
  listPublicForExternalTraining,
  registerLetterOrderUpload,
  getDownloadStreamContext,
  removeAllFilesForExternalTraining,
  deleteAttachment,
  mapPublicRow,
};
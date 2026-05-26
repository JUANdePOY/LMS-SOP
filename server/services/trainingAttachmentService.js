const fs = require('fs/promises');
const path = require('path');
const trainingModel = require('../models/trainingModel');
const attachmentModel = require('../models/trainingAttachmentModel');
const {
  getUploadRoot,
  isAllowedMime,
  safeExtFromOriginal,
  trainingDir,
  absolutePathFromRelative,
} = require('../config/uploads');

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

async function listPublicForTraining(trainingId) {
  try {
    const rows = await attachmentModel.listByTrainingId(trainingId);
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
  const root = getUploadRoot();
  for (const rel of relativePaths) {
    const abs = absolutePathFromRelative(rel);
    if (abs) await unlinkQuiet(abs);
  }
}

/**
 * Replace existing letter_order rows for this training, insert new metadata, remove old files from disk.
 * Caller must have already written `diskAbsolutePath` (e.g. via multer).
 */
async function registerLetterOrderUpload(trainingId, file, userId) {
  const training = await trainingModel.findInternalById(trainingId);
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

  const relativePath = path.join('trainings', String(trainingId), file.filename).replace(/\\/g, '/');
  const absNew = absolutePathFromRelative(relativePath);
  const resolvedFile = path.resolve(file.path);
  const trainingAbsDir = path.resolve(trainingDir(trainingId));
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
      `SELECT relative_path FROM internal_training_attachments WHERE training_id = ? AND kind = ?`,
      [trainingId, attachmentModel.KIND_LETTER_ORDER]
    );
    oldPaths = existing.map((r) => r.relative_path);

    await conn.beginTransaction();
    await attachmentModel.deleteByTrainingAndKind(conn, trainingId, attachmentModel.KIND_LETTER_ORDER);
    insertId = await attachmentModel.insert(conn, {
      training_id: trainingId,
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
  const row = await attachmentModel.findByIdForTraining(insertId, trainingId);
  return mapPublicRow(row);
}

async function getDownloadStreamContext(attachmentId, trainingId) {
  const row = await attachmentModel.findByIdForTraining(attachmentId, trainingId);
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

/** Before deleting a training row, remove files from disk (DB CASCADE removes metadata). */
async function removeAllFilesForTraining(trainingId) {
  let paths = [];
  try {
    paths = await attachmentModel.listAllRelativePathsForTraining(trainingId);
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE' || e.errno === 1146) {
      return;
    }
    throw e;
  }
  await unlinkRelativePaths(paths);
}

module.exports = {
  listPublicForTraining,
  registerLetterOrderUpload,
  getDownloadStreamContext,
  removeAllFilesForTraining,
  mapPublicRow,
};

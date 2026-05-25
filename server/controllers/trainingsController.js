const trainingsService = require('../services/trainingsService');
const trainingAttachmentService = require('../services/trainingAttachmentService');
const externalTrainingAttachmentService = require('../services/externalTrainingAttachmentService');
const { logAudit } = require('../utils/auditLogger');

function sendError(res, err, fallback = 'Request failed') {
  const code = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const message = err.statusCode ? err.message : fallback;
  const body = { success: false, message };
  // Non-production: surface driver/SQL errors so misconfigured or stale API processes are obvious in Network tab.
  if (process.env.NODE_ENV !== 'production' && code === 500 && err && typeof err === 'object') {
    if (err.message && err.message !== message) body.details = err.message;
    if (err.sqlMessage) body.sqlMessage = err.sqlMessage;
    if (err.code) body.code = err.code;
  }
  return res.status(code).json(body);
}

function listInternal(req, res) {
  trainingsService
    .listInternalTrainings(req.query)
    .then((data) =>
      res.json({
        success: true,
        message: 'OK',
        data,
      })
    )
    .catch((err) => sendError(res, err, 'Failed to list trainings'));
}

function getInternal(req, res) {
  trainingsService
    .getInternalTrainingById(req.params.id)
    .then((row) => {
      if (!row) return res.status(404).json({ success: false, message: 'Training not found' });
      return res.json({ success: true, message: 'OK', data: row });
    })
    .catch((err) => sendError(res, err, 'Failed to load training'));
}

function createInternal(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  trainingsService
    .createInternalTraining(req.body, userId)
    .then((data) => {
      logAudit('training.create', userId, { trainingId: data.id });
      return res.status(201).json({ success: true, message: 'Training created successfully', data });
    })
    .catch((err) => sendError(res, err, 'Failed to create training'));
}

function updateInternal(req, res) {
  const userId = req.user?.id;
  trainingsService
    .updateInternalTraining(req.params.id, req.body)
    .then((data) => {
      logAudit('training.update', userId, { trainingId: req.params.id });
      return res.json({ success: true, message: 'Training updated successfully', data });
    })
    .catch((err) => sendError(res, err, 'Failed to update training'));
}

function deleteInternal(req, res) {
  const userId = req.user?.id;
  trainingsService
    .deleteInternalTraining(req.params.id)
    .then((ok) => {
      if (!ok) return res.status(404).json({ success: false, message: 'Training not found' });
      logAudit('training.delete', userId, { trainingId: req.params.id });
      return res.json({ success: true, message: 'Training deleted successfully', data: null });
    })
    .catch((err) => sendError(res, err, 'Failed to delete training'));
}

function listActivities(req, res) {
  trainingsService
    .listActivities(req.params.trainingId)
    .then((activities) => res.json({ success: true, message: 'OK', data: { activities } }))
    .catch((err) => sendError(res, err, 'Failed to list activities'));
}

function createActivity(req, res) {
  const userId = req.user?.id;
  trainingsService
    .createActivity(req.params.trainingId, req.body)
    .then((activities) => {
      logAudit('activity.create', userId, { trainingId: req.params.trainingId });
      return res.status(201).json({ success: true, message: 'Activity created', data: { activities } });
    })
    .catch((err) => sendError(res, err, 'Failed to create activity'));
}

function updateActivity(req, res) {
  const userId = req.user?.id;
  trainingsService
    .updateActivity(req.params.trainingId, req.params.activityId, req.body)
    .then((activity) => {
      logAudit('activity.update', userId, { activityId: req.params.activityId });
      return res.json({ success: true, message: 'Activity updated', data: activity });
    })
    .catch((err) => sendError(res, err, 'Failed to update activity'));
}

function deleteActivity(req, res) {
  const userId = req.user?.id;
  trainingsService
    .deleteActivity(req.params.trainingId, req.params.activityId)
    .then(() => {
      logAudit('activity.delete', userId, { activityId: req.params.activityId });
      return res.json({ success: true, message: 'Activity deleted', data: null });
    })
    .catch((err) => sendError(res, err, 'Failed to delete activity'));
}

function listExternal(req, res) {
  trainingsService
    .listExternalTrainings(req.query)
    .then((data) => res.json({ success: true, message: 'OK', data }))
    .catch((err) => sendError(res, err, 'Failed to list external trainings'));
}

function getExternal(req, res) {
  trainingsService
    .getExternalTrainingById(req.params.id)
    .then((row) => {
      if (!row) return res.status(404).json({ success: false, message: 'Training not found' });
      return res.json({ success: true, message: 'OK', data: row });
    })
    .catch((err) => sendError(res, err, 'Failed to load training'));
}

function createExternal(req, res) {
  const userId = req.user?.id;
  trainingsService
    .createExternalTraining(req.body)
    .then((data) => {
      logAudit('external_training.create', userId, { id: data.id });
      return res.status(201).json({ success: true, message: 'External training created', data });
    })
    .catch((err) => sendError(res, err, 'Failed to create external training'));
}

function updateExternal(req, res) {
  const userId = req.user?.id;
  trainingsService
    .updateExternalTraining(req.params.id, req.body)
    .then((data) => {
      logAudit('external_training.update', userId, { id: req.params.id });
      return res.json({ success: true, message: 'External training updated', data });
    })
    .catch((err) => sendError(res, err, 'Failed to update external training'));
}

function deleteExternal(req, res) {
  const userId = req.user?.id;
  trainingsService
    .deleteExternalTraining(req.params.id)
    .then((ok) => {
      if (!ok) return res.status(404).json({ success: false, message: 'Training not found' });
      logAudit('external_training.delete', userId, { id: req.params.id });
      return res.json({ success: true, message: 'External training deleted', data: null });
    })
    .catch((err) => sendError(res, err, 'Failed to delete external training'));
}

function registerExternal(req, res) {
  trainingsService
    .registerExternalParticipant(req.params.id, req.body.participantData)
    .then((data) => res.status(201).json({ success: true, message: 'Registered', data }))
    .catch((err) => sendError(res, err, 'Registration failed'));
}

function getTrainingSlotAvailability(req, res) {
  trainingsService
    .getTrainingSlotAvailability(req.params.id)
    .then((data) => res.json({ success: true, message: 'OK', data }))
    .catch((err) => sendError(res, err, 'Failed to get slot availability'));
}

function listRegistrations(req, res) {
  trainingsService
    .listExternalRegistrations(req.params.id)
    .then((registrations) =>
      res.json({ success: true, message: 'OK', data: { registrations } })
    )
    .catch((err) => sendError(res, err, 'Failed to load registrations'));
}

function uploadLetterOrder(req, res) {
  const userId = req.user?.id;
  const trainingId = Number(req.params.trainingId);
  trainingAttachmentService
    .registerLetterOrderUpload(trainingId, req.file, userId)
    .then((data) => {
      logAudit('training.letter_order.upload', userId, { trainingId, attachmentId: data?.id });
      return res.status(201).json({ success: true, message: 'Letter order saved', data });
    })
    .catch((err) => sendError(res, err, 'Upload failed'));
}

function downloadTrainingAttachment(req, res) {
  const trainingId = Number(req.params.trainingId);
  const attachmentId = Number(req.params.attachmentId);
  trainingAttachmentService
    .getDownloadStreamContext(attachmentId, trainingId)
    .then((ctx) => {
      res.download(ctx.absolutePath, ctx.originalFilename, (err) => {
        if (err && !res.headersSent) {
          res.status(404).json({ success: false, message: 'File not available' });
        }
      });
    })
    .catch((err) => sendError(res, err, 'Download failed'));
}

function downloadExternalTrainingAttachment(req, res) {
  const externalTrainingId = Number(req.params.id);
  const attachmentId = Number(req.params.attachmentId);
  externalTrainingAttachmentService
    .getDownloadStreamContext(attachmentId, externalTrainingId)
    .then((ctx) => {
      res.download(ctx.absolutePath, ctx.originalFilename, (err) => {
        if (err && !res.headersSent) {
          res.status(404).json({ success: false, message: 'File not available' });
        }
      });
    })
    .catch((err) => sendError(res, err, 'Download failed'));
}

function uploadExternalLetterOrder(req, res) {
  const userId = req.user?.id;
  const externalTrainingId = Number(req.params.id);
  externalTrainingAttachmentService
    .registerLetterOrderUpload(externalTrainingId, req.file, userId)
    .then((data) => {
      logAudit('external_training.letter_order.upload', userId, { externalTrainingId, attachmentId: data?.id });
      return res.status(201).json({ success: true, message: 'Letter order saved', data });
    })
    .catch((err) => sendError(res, err, 'Upload failed'));
}

function listInternalAttachments(req, res) {
  const trainingId = Number(req.params.trainingId);
  trainingAttachmentService
    .listPublicForTraining(trainingId)
    .then((attachments) => res.json({ success: true, message: 'OK', data: attachments }))
    .catch((err) => sendError(res, err, 'Failed to list attachments'));
}

function listExternalAttachments(req, res) {
  const externalTrainingId = Number(req.params.id);
  externalTrainingAttachmentService
    .listPublicForExternalTraining(externalTrainingId)
    .then((attachments) => res.json({ success: true, message: 'OK', data: attachments }))
    .catch((err) => sendError(res, err, 'Failed to list attachments'));
}

module.exports = {
  listInternal,
  getInternal,
  createInternal,
  updateInternal,
  deleteInternal,
  listActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  listExternal,
  getExternal,
  createExternal,
  updateExternal,
  deleteExternal,
  registerExternal,
  listRegistrations,
  uploadLetterOrder,
  downloadTrainingAttachment,
  uploadExternalLetterOrder,
  downloadExternalTrainingAttachment,
  getTrainingSlotAvailability,
  listInternalAttachments,
  listExternalAttachments,
};

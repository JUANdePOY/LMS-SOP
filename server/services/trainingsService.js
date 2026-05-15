const trainingModel = require('../models/trainingModel');
const activityModel = require('../models/activityModel');
const externalModel = require('../models/externalTrainingModel');
const trainingAttachmentService = require('./trainingAttachmentService');
const { buildActivityDescription, parseActivityMeta } = require('../utils/activityMeta');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function clampPagination(page, limit) {
  const p = Math.max(1, parseInt(page, 10) || DEFAULT_PAGE);
  const l = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit, 10) || DEFAULT_LIMIT));
  return { page: p, limit: l };
}

function computeEndFromDuration(startDt, durationHours) {
  const start = new Date(startDt);
  if (Number.isNaN(start.getTime())) return startDt;
  const h = Number(durationHours);
  if (Number.isNaN(h)) return startDt;
  const end = new Date(start.getTime() + h * 3600 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())} ${pad(end.getHours())}:${pad(end.getMinutes())}:${pad(end.getSeconds())}`;
}

function resolveInternalRange(body, existing) {
  let start = existing.start_datetime;
  let end = existing.end_datetime;

  if (body.start_datetime != null || body.start_date != null) {
    start = trainingModel.toDatetime(body.start_datetime ?? body.start_date, false);
  }

  const hasExplicitEnd = body.end_datetime != null || body.end_date != null;
  if (hasExplicitEnd) {
    end = trainingModel.toDatetime(body.end_datetime ?? body.end_date, true);
  } else if (body.duration_hours != null && body.duration_hours !== '') {
    end = computeEndFromDuration(start, body.duration_hours);
  } else if (body.start_datetime != null || body.start_date != null) {
    end = start;
  }

  return { start, end };
}

function normalizeVenue(venue) {
  const v = venue != null && String(venue).trim() !== '' ? String(venue).trim() : 'TBD';
  return v.slice(0, 500);
}

async function listInternalTrainings(query) {
  const { page, limit } = clampPagination(query.page, query.limit);
  const search = query.search ? String(query.search).trim() : '';
  const status = query.status && query.status !== 'all' ? query.status : null;
  const type = query.type && query.type !== 'all' ? query.type : null;

  if (status && !trainingModel.isValidInternalStatus(status)) {
    const err = new Error('Invalid status filter');
    err.statusCode = 400;
    throw err;
  }

  const [total, rows] = await Promise.all([
    trainingModel.countInternal({ search: search || null, status, type }),
    trainingModel.findInternalMany({ page, limit, search: search || null, status, type }),
  ]);

  return {
    trainings: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  };
}

async function getInternalTrainingById(id) {
  const training = await trainingModel.findInternalById(id);
  if (!training) return null;
  const [activities, attachments] = await Promise.all([
    activityModel.listByTrainingId(id, training.status),
    trainingAttachmentService.listPublicForTraining(id),
  ]);
  return { ...training, activities, attachments };
}

async function createInternalTraining(body, createdByUserId) {
  const start = trainingModel.toDatetime(body.start_datetime || body.start_date, false);
  if (!start) {
    const err = new Error('start_datetime is required');
    err.statusCode = 400;
    throw err;
  }

  const tempExisting = { start_datetime: start, end_datetime: start };
  const { start: startF, end: endF } = resolveInternalRange(body, tempExisting);

  const status = body.status && trainingModel.isValidInternalStatus(body.status) ? body.status : 'draft';
  const venue = normalizeVenue(body.venue ?? body.location);
  const title = String(body.title || '').trim();
  if (!title) {
    const err = new Error('Title is required');
    err.statusCode = 400;
    throw err;
  }

  const conn = await trainingModel.pool.getConnection();
  try {
    await conn.beginTransaction();
    const trainingId = await trainingModel.insertInternal(conn, {
      title,
      description: body.description ?? null,
      start_datetime: startF,
      end_datetime: endF,
      venue,
      area_id: body.area_id ?? null,
      status,
      capacity: body.capacity != null ? Number(body.capacity) : null,
      is_mandatory: !!body.is_mandatory,
      created_by: createdByUserId,
    });

    const metaDesc = buildActivityDescription({
      activityType: body.activity_type || null,
      requirements: body.requirements || null,
    });

    await activityModel.insertActivity(conn, {
      training_id: trainingId,
      title: title.slice(0, 500),
      description: metaDesc,
      start_time: startF,
      end_time: endF,
      location: venue.slice(0, 500),
      instructor: body.instructor ? String(body.instructor).slice(0, 200) : null,
      is_mandatory: body.activity_is_mandatory !== false,
    });

    await conn.commit();
    return getInternalTrainingById(trainingId);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function updateInternalTraining(id, body) {
  const existing = await trainingModel.findInternalById(id);
  if (!existing) {
    const err = new Error('Training not found');
    err.statusCode = 404;
    throw err;
  }

  const { start, end } = resolveInternalRange(body, existing);

  const trainingPatch = {};
  if (body.title != null) trainingPatch.title = String(body.title).trim();
  if (body.description !== undefined) trainingPatch.description = body.description;
  if (body.area_id !== undefined) trainingPatch.area_id = body.area_id;
  if (body.status != null) {
    if (!trainingModel.isValidInternalStatus(body.status)) {
      const err = new Error('Invalid status');
      err.statusCode = 400;
      throw err;
    }
    trainingPatch.status = body.status;
  }
  if (body.capacity !== undefined) trainingPatch.capacity = body.capacity != null ? Number(body.capacity) : null;
  if (body.is_mandatory !== undefined) trainingPatch.is_mandatory = !!body.is_mandatory;

  if (
    body.start_datetime != null ||
    body.start_date != null ||
    body.end_datetime != null ||
    body.end_date != null ||
    body.duration_hours !== undefined
  ) {
    trainingPatch.start_datetime = start;
    trainingPatch.end_datetime = end;
  }
  if (body.venue !== undefined || body.location !== undefined) {
    trainingPatch.venue = normalizeVenue(body.venue ?? body.location ?? existing.venue);
  }

  const conn = await trainingModel.pool.getConnection();
  try {
    await conn.beginTransaction();

    if (Object.keys(trainingPatch).length) {
      await trainingModel.updateInternal(id, trainingPatch, conn);
    }

    const primaryId = await activityModel.getPrimaryActivityId(id);
    const venue = trainingPatch.venue ?? existing.venue ?? existing.location;
    const prevMeta = await loadPrimaryMeta(id);

    const metaDesc = buildActivityDescription({
      activityType: body.activity_type !== undefined ? body.activity_type : prevMeta.activityType,
      requirements: body.requirements !== undefined ? body.requirements : prevMeta.requirements,
    });

    if (primaryId) {
      const actPatch = {
        start_time: start,
        end_time: end,
        location: venue ? String(venue).slice(0, 500) : null,
      };
      if (body.instructor !== undefined) {
        actPatch.instructor = body.instructor ? String(body.instructor).slice(0, 200) : null;
      }
      if (body.title != null) actPatch.title = String(body.title).trim().slice(0, 500);
      if (body.activity_is_mandatory !== undefined) {
        actPatch.is_mandatory = body.activity_is_mandatory ? 1 : 0;
      }
      if (
        body.activity_type !== undefined ||
        body.requirements !== undefined ||
        body.start_datetime != null ||
        body.start_date != null ||
        body.end_datetime != null ||
        body.end_date != null ||
        body.duration_hours !== undefined ||
        body.venue !== undefined ||
        body.location !== undefined
      ) {
        actPatch.description = metaDesc;
      }
      await activityModel.updateActivity(primaryId, id, actPatch, conn);
    } else {
      await activityModel.insertActivity(conn, {
        training_id: id,
        title: (trainingPatch.title || existing.title).toString().slice(0, 500),
        description: metaDesc,
        start_time: start,
        end_time: end,
        location: venue ? String(venue).slice(0, 500) : null,
        instructor: body.instructor != null ? String(body.instructor).slice(0, 200) : null,
        is_mandatory: body.activity_is_mandatory !== false ? 1 : 0,
      });
    }

    await conn.commit();
    return getInternalTrainingById(id);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function loadPrimaryMeta(trainingId) {
  const pid = await activityModel.getPrimaryActivityId(trainingId);
  if (!pid) return { activityType: null, requirements: null };
  const row = await activityModel.findById(pid, trainingId);
  if (!row) return { activityType: null, requirements: null };
  const meta = parseActivityMeta(row.description);
  return { activityType: meta.activityType || null, requirements: meta.requirements || null };
}

async function deleteInternalTraining(trainingId) {
  await trainingAttachmentService.removeAllFilesForTraining(trainingId);
  const n = await trainingModel.deleteInternal(trainingId);
  return n > 0;
}

async function listActivities(trainingId) {
  const training = await trainingModel.findInternalById(trainingId);
  if (!training) {
    const err = new Error('Training not found');
    err.statusCode = 404;
    throw err;
  }
  return activityModel.listByTrainingId(trainingId, training.status);
}

async function createActivity(trainingId, body) {
  const training = await trainingModel.findInternalById(trainingId);
  if (!training) {
    const err = new Error('Training not found');
    err.statusCode = 404;
    throw err;
  }
  const title = String(body.title || '').trim();
  if (!title) {
    const err = new Error('Activity title is required');
    err.statusCode = 400;
    throw err;
  }
  const start = trainingModel.toDatetime(body.start_time || body.start_datetime, false);
  const end = trainingModel.toDatetime(body.end_time || body.end_datetime, true);
  if (!start || !end) {
    const err = new Error('start_time and end_time are required');
    err.statusCode = 400;
    throw err;
  }
  const metaDesc = buildActivityDescription({
    activityType: body.activity_type || body.type || null,
    requirements: body.requirements || null,
  });
  await activityModel.insertActivity(null, {
    training_id: trainingId,
    title: title.slice(0, 500),
    description: metaDesc,
    start_time: start,
    end_time: end,
    location: body.location ? String(body.location).slice(0, 500) : null,
    instructor: body.instructor ? String(body.instructor).slice(0, 200) : null,
    is_mandatory: body.is_mandatory !== false,
  });
  return listActivities(trainingId);
}

async function updateActivity(trainingId, activityId, body) {
  const row = await activityModel.findById(activityId, trainingId);
  if (!row) {
    const err = new Error('Activity not found');
    err.statusCode = 404;
    throw err;
  }
  const patch = {};
  if (body.title != null) patch.title = String(body.title).trim().slice(0, 500);
  if (body.start_time != null || body.start_datetime != null) {
    patch.start_time = trainingModel.toDatetime(body.start_time || body.start_datetime, false);
  }
  if (body.end_time != null || body.end_datetime != null) {
    patch.end_time = trainingModel.toDatetime(body.end_time || body.end_datetime, true);
  }
  if (body.location !== undefined) patch.location = body.location ? String(body.location).slice(0, 500) : null;
  if (body.instructor !== undefined) patch.instructor = body.instructor ? String(body.instructor).slice(0, 200) : null;
  if (body.is_mandatory !== undefined) patch.is_mandatory = body.is_mandatory ? 1 : 0;

  if (body.activity_type !== undefined || body.type !== undefined || body.requirements !== undefined) {
    const meta = parseActivityMeta(row.description);
    if (body.activity_type !== undefined || body.type !== undefined) {
      meta.activityType = body.activity_type ?? body.type ?? meta.activityType;
    }
    if (body.requirements !== undefined) meta.requirements = body.requirements;
    patch.description = buildActivityDescription({
      activityType: meta.activityType,
      requirements: meta.requirements,
    });
  }

  const n = await activityModel.updateActivity(activityId, trainingId, patch);
  if (!n) {
    const err = new Error('Nothing to update');
    err.statusCode = 400;
    throw err;
  }
  const training = await trainingModel.findInternalById(trainingId);
  return activityModel.mapActivityRow(await activityModel.findById(activityId, trainingId), training?.status);
}

async function deleteActivity(trainingId, activityId) {
  const n = await activityModel.deleteActivity(activityId, trainingId);
  if (!n) {
    const err = new Error('Activity not found');
    err.statusCode = 404;
    throw err;
  }
  return true;
}

async function listExternalTrainings(query) {
  const { page, limit } = clampPagination(query.page, query.limit);
  const search = query.search ? String(query.search).trim() : '';
  const status = query.status && query.status !== 'all' ? query.status : null;

  if (status && !externalModel.isValidExternalStatus(status)) {
    const err = new Error('Invalid status filter');
    err.statusCode = 400;
    throw err;
  }

  const [total, rows] = await Promise.all([
    externalModel.countExternal({ search: search || null, status }),
    externalModel.findExternalMany({ page, limit, search: search || null, status }),
  ]);

  return {
    trainings: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  };
}

async function getExternalTrainingById(id) {
  return externalModel.findExternalById(id);
}

async function createExternalTraining(body) {
  const title = String(body.title || '').trim();
  if (!title) {
    const err = new Error('Title is required');
    err.statusCode = 400;
    throw err;
  }
  if (!body.start_date) {
    const err = new Error('start_date is required');
    err.statusCode = 400;
    throw err;
  }
  const status = body.status && externalModel.isValidExternalStatus(body.status) ? body.status : 'draft';
  const newId = await externalModel.insertExternal({
    title,
    description: body.description ?? null,
    start_date: body.start_date,
    start_time: body.start_time ?? null,
    venue: body.venue ?? null,
    status,
    capacity: body.capacity != null ? Number(body.capacity) : null,
    is_mandatory: !!body.is_mandatory,
    registration_fields: body.registration_fields ?? null,
  });
  return externalModel.findExternalById(newId);
}

async function updateExternalTraining(id, body) {
  const existing = await externalModel.findExternalById(id);
  if (!existing) {
    const err = new Error('External training not found');
    err.statusCode = 404;
    throw err;
  }
  const patch = {};
  if (body.title !== undefined) patch.title = String(body.title).trim();
  if (body.description !== undefined) patch.description = body.description;
  if (body.start_date !== undefined) patch.start_date = body.start_date;
  if (body.start_time !== undefined) patch.start_time = body.start_time;
  if (body.venue !== undefined) patch.venue = body.venue;
  if (body.capacity !== undefined) patch.capacity = body.capacity != null ? Number(body.capacity) : null;
  if (body.is_mandatory !== undefined) patch.is_mandatory = !!body.is_mandatory;
  if (body.registration_fields !== undefined) patch.registration_fields = body.registration_fields;
  if (body.status !== undefined) {
    if (!externalModel.isValidExternalStatus(body.status)) {
      const err = new Error('Invalid status');
      err.statusCode = 400;
      throw err;
    }
    patch.status = body.status;
  }
  await externalModel.updateExternal(id, patch);
  return externalModel.findExternalById(id);
}

async function deleteExternalTraining(id) {
  const n = await externalModel.deleteExternal(id);
  return n > 0;
}

async function registerExternalParticipant(trainingId, participantData) {
  const t = await externalModel.findExternalById(trainingId);
  if (!t) {
    const err = new Error('Training not found');
    err.statusCode = 404;
    throw err;
  }
  if (t.status !== 'open') {
    const err = new Error('Registration is not open for this training');
    err.statusCode = 400;
    throw err;
  }
  const pd =
    participantData == null
      ? null
      : typeof participantData === 'string'
        ? participantData
        : JSON.stringify(participantData);
  const [result] = await trainingModel.pool.query(
    'INSERT INTO training_registrations (training_id, participant_data) VALUES (?, ?)',
    [trainingId, pd]
  );
  return { id: result.insertId };
}

async function listExternalRegistrations(trainingId) {
  const t = await externalModel.findExternalById(trainingId);
  if (!t) {
    const err = new Error('Training not found');
    err.statusCode = 404;
    throw err;
  }
  const [rows] = await trainingModel.pool.query(
    'SELECT id, training_id, participant_data, registered_at FROM training_registrations WHERE training_id = ? ORDER BY registered_at DESC',
    [trainingId]
  );
  return rows.map((r) => ({
    ...r,
    participant_data:
      typeof r.participant_data === 'string' ? safeJson(r.participant_data) : r.participant_data,
  }));
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

module.exports = {
  listInternalTrainings,
  getInternalTrainingById,
  createInternalTraining,
  updateInternalTraining,
  deleteInternalTraining,
  listActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  listExternalTrainings,
  getExternalTrainingById,
  createExternalTraining,
  updateExternalTraining,
  deleteExternalTraining,
  registerExternalParticipant,
  listExternalRegistrations,
};

const eventModel = require('../models/eventModel');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

function sendError(res, err, fallback = 'Request failed') {
  const code = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const message = err.statusCode ? err.message : fallback;
  const body = { success: false, message };
  if (process.env.NODE_ENV !== 'production' && code === 500 && err && typeof err === 'object') {
    if (err.message && err.message !== message) body.details = err.message;
    if (err.sqlMessage) body.sqlMessage = err.sqlMessage;
    if (err.code) body.code = err.code;
  }
  if (code === 500) console.error('[Events Controller Error]', err);
  return res.status(code).json(body);
}

function listEvents(req, res) {
  const { event_type, priority, status, page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);

  eventModel.findAll()
    .then((rows) => {
      let filtered = rows;
      if (event_type) filtered = filtered.filter((r) => r.event_type === event_type);
      if (priority) filtered = filtered.filter((r) => r.priority === priority);
      if (status) filtered = filtered.filter((r) => r.status === status);

      const total = filtered.length;
      const start = (pageNum - 1) * limitNum;
      const data = filtered.slice(start, start + limitNum);

      res.json({
        success: true,
        message: 'OK',
        data,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      });
    })
    .catch((err) => sendError(res, err, 'Failed to list events'));
}

function getEvent(req, res) {
  const { id } = req.params;
  eventModel.findById(id)
    .then((row) => {
      if (!row) return res.status(404).json({ success: false, message: 'Event not found', code: 'NOT_FOUND' });
      res.json({ success: true, message: 'OK', data: row });
    })
    .catch((err) => sendError(res, err, 'Failed to load event'));
}

function createEvent(req, res) {
  const userId = req.user?.id;
  const { title, description, event_type, priority, status, event_date, end_date, location } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Title is required', code: 'VALIDATION_ERROR' });
  }
  if (!event_date) {
    return res.status(400).json({ success: false, message: 'Event date is required', code: 'VALIDATION_ERROR' });
  }

  eventModel.create({
    title: title.trim(),
    description: description?.trim() || '',
    event_type: event_type || 'Training',
    priority: priority || 'medium',
    status: status || 'active',
    event_date,
    end_date: end_date || null,
    location: location || null,
    organizer: req.user?.full_name || 'System',
  })
    .then((row) => {
      logAudit && logAudit('event.create', userId, { eventId: row.id });
      res.status(201).json({ success: true, message: 'Event created successfully', data: row });
    })
    .catch((err) => sendError(res, err, 'Failed to create event'));
}

function updateEvent(req, res) {
  const { id } = req.params;
  const userId = req.user?.id;
  const { title, description, event_type, priority, status, event_date, end_date, location } = req.body;

  eventModel.findById(id)
    .then((row) => {
      if (!row) return res.status(404).json({ success: false, message: 'Event not found', code: 'NOT_FOUND' });
      return eventModel.update(id, {
        title: title?.trim() || row.title,
        description: description?.trim() || row.description,
        event_type: event_type || row.event_type,
        priority: priority || row.priority,
        status: status || row.status,
        event_date: event_date || row.event_date,
        end_date: end_date ?? row.end_date,
        location: location ?? row.location,
        organizer: row.organizer,
      });
    })
    .then((row) => {
      logAudit && logAudit('event.update', userId, { eventId: id });
      res.json({ success: true, message: 'Event updated successfully', data: row });
    })
    .catch((err) => sendError(res, err, 'Failed to update event'));
}

function deleteEvent(req, res) {
  const { id } = req.params;
  const userId = req.user?.id;

  eventModel.findById(id)
    .then((row) => {
      if (!row) return res.status(404).json({ success: false, message: 'Event not found', code: 'NOT_FOUND' });
      return eventModel.delete(id);
    })
    .then(() => {
      logAudit && logAudit('event.delete', userId, { eventId: id });
      res.json({ success: true, message: 'Event deleted successfully' });
    })
    .catch((err) => sendError(res, err, 'Failed to delete event'));
}

module.exports = {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
};

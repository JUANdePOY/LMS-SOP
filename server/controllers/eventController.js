const eventModel = require('../models/eventModel');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');
const { broadcastSystemChange } = require('../services/notificationService');
const calendarService = require('../services/calendarService');
const db = require('../config/database');

function propagate(eventId, action) {
  calendarService.propagateEventChange(eventId, action).catch(() => {});
}

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

function getEventBusinessFilter(user) {
  if (user?.role === 'super_admin') {
    return { business_id: null };
  }
  const businessId = user?.business_id;
  if (!businessId) {
    return { business_id: null, denied: true };
  }
  return { business_id: businessId };
}

function listEvents(req, res) {
  const { event_type, priority, status, page = 1, limit = 20, target_role, target_department } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const { business_id, denied } = getEventBusinessFilter(req.user);

  if (denied) {
    return res.json({
      success: true,
      message: 'OK',
      data: [],
      pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
    });
  }

  eventModel.findAll({ business_id, event_type, priority, status, target_role, target_department, page: pageNum, limit: limitNum })
    .then((rows) => {
      res.json({
        success: true,
        message: 'OK',
        data: rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: rows.length,
          totalPages: 1,
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
      if (req.user?.role !== 'super_admin') {
        if (row.business_id && row.business_id !== req.user?.business_id) {
          return res.status(403).json({ success: false, message: 'Access denied: event is outside your business scope', code: 'BUSINESS_SCOPE_DENIED' });
        }
        if (!row.business_id && !req.user?.business_id) {
          return res.status(403).json({ success: false, message: 'Access denied: event is outside your business scope', code: 'BUSINESS_SCOPE_DENIED' });
        }
      }
      res.json({ success: true, message: 'OK', data: row });
    })
    .catch((err) => sendError(res, err, 'Failed to load event'));
}

function createEvent(req, res) {
  const userId = req.user?.id;
  const { title, description, event_type, priority, status, event_date, end_date, location, target_roles, target_departments } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Title is required', code: 'VALIDATION_ERROR' });
  }
  if (!event_date) {
    return res.status(400).json({ success: false, message: 'Event date is required', code: 'VALIDATION_ERROR' });
  }

  const businessId = req.user?.business_id || null;
  const parsedTargetRoles = Array.isArray(target_roles) ? target_roles : null;
  const parsedTargetDepartments = Array.isArray(target_departments) ? target_departments.map(String) : null;

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
    business_id: businessId,
    target_roles: parsedTargetRoles,
    target_departments: parsedTargetDepartments,
  })
    .then((row) => {
      logAudit && logAudit('event.create', userId, { eventId: row.id });
      propagate(row.id, 'update');
      broadcastSystemChange({
        title: 'New Event',
        body: row.title,
        type: 'info',
        link: '/events',
        entityType: 'event',
        entityId: row.id,
        targetUserIds: getBusinessUserIds(businessId),
      }).catch(() => {});
      res.status(201).json({ success: true, message: 'Event created successfully', data: row });
    })
    .catch((err) => sendError(res, err, 'Failed to create event'));
}

function updateEvent(req, res) {
  const { id } = req.params;
  const userId = req.user?.id;
  const { title, description, event_type, priority, status, event_date, end_date, location, target_roles, target_departments } = req.body;

  eventModel.findById(id)
    .then((row) => {
      if (!row) return res.status(404).json({ success: false, message: 'Event not found', code: 'NOT_FOUND' });
      if (req.user?.role !== 'super_admin' && row.business_id && row.business_id !== req.user?.business_id) {
        return res.status(403).json({ success: false, message: 'Access denied: event is outside your business scope', code: 'BUSINESS_SCOPE_DENIED' });
      }
      const parsedTargetRoles = Array.isArray(target_roles) ? target_roles : row.target_roles;
      const parsedTargetDepartments = Array.isArray(target_departments) ? target_departments.map(String) : row.target_departments;
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
        business_id: row.business_id,
        target_roles: parsedTargetRoles,
        target_departments: parsedTargetDepartments,
      });
    })
    .then((row) => {
      logAudit && logAudit('event.update', userId, { eventId: id });
      propagate(id, 'update');
      broadcastSystemChange({
        title: 'Event Updated',
        body: row.title,
        type: 'info',
        link: '/events',
        entityType: 'event',
        entityId: row.id,
        targetUserIds: getBusinessUserIds(row.business_id),
      }).catch(() => {});
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
      if (req.user?.role !== 'super_admin' && row.business_id && row.business_id !== req.user?.business_id) {
        return res.status(403).json({ success: false, message: 'Access denied: event is outside your business scope', code: 'BUSINESS_SCOPE_DENIED' });
      }
      return eventModel.delete(id);
    })
    .then(() => {
      logAudit && logAudit('event.delete', userId, { eventId: id });
      propagate(id, 'delete');
      res.json({ success: true, message: 'Event deleted successfully' });
    })
    .catch((err) => sendError(res, err, 'Failed to delete event'));
}

async function getBusinessUserIds(businessId) {
  if (!businessId) return null;
  const [rows] = await db.query(
    'SELECT id FROM users WHERE business_id = ? AND role NOT IN (\'super_admin\') AND is_active = 1',
    [businessId]
  );
  return rows.map((u) => u.id);
}

module.exports = {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
};

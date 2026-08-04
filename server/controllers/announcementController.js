const announcementModel = require('../models/announcementModel');
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
  if (code === 500) console.error('[Announcements Controller Error]', err);
  return res.status(code).json(body);
}

function listAnnouncements(req, res) {
  const { type, priority, status, page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);

  announcementModel.findAll()
    .then((rows) => {
      let filtered = rows;
      if (type) filtered = filtered.filter((r) => r.type === type);
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
    .catch((err) => sendError(res, err, 'Failed to list announcements'));
}

function getAnnouncement(req, res) {
  const { id } = req.params;
  announcementModel.findById(id)
    .then((row) => {
      if (!row) return res.status(404).json({ success: false, message: 'Announcement not found', code: 'NOT_FOUND' });
      res.json({ success: true, message: 'OK', data: row });
    })
    .catch((err) => sendError(res, err, 'Failed to load announcement'));
}

function createAnnouncement(req, res) {
  const userId = req.user?.id;
  const { title, type, priority, status, body } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Title is required', code: 'VALIDATION_ERROR' });
  }
  if (!body || !body.trim()) {
    return res.status(400).json({ success: false, message: 'Body is required', code: 'VALIDATION_ERROR' });
  }

  announcementModel.create({
    title: title.trim(),
    type: type || 'General',
    priority: priority || 'medium',
    status: status || 'active',
    author: req.user?.full_name || 'System',
    body: body.trim(),
  })
    .then((row) => {
      logAudit && logAudit('announcement.create', userId, { announcementId: row.id });
      res.status(201).json({ success: true, message: 'Announcement created successfully', data: row });
    })
    .catch((err) => sendError(res, err, 'Failed to create announcement'));
}

function updateAnnouncement(req, res) {
  const { id } = req.params;
  const userId = req.user?.id;
  const { title, type, priority, status, body } = req.body;

  announcementModel.findById(id)
    .then((row) => {
      if (!row) return res.status(404).json({ success: false, message: 'Announcement not found', code: 'NOT_FOUND' });
      return announcementModel.update(id, {
        title: title?.trim() || row.title,
        type: type || row.type,
        priority: priority || row.priority,
        status: status || row.status,
        author: row.author,
        body: body?.trim() || row.body,
      });
    })
    .then((row) => {
      logAudit && logAudit('announcement.update', userId, { announcementId: id });
      res.json({ success: true, message: 'Announcement updated successfully', data: row });
    })
    .catch((err) => sendError(res, err, 'Failed to update announcement'));
}

function deleteAnnouncement(req, res) {
  const { id } = req.params;
  const userId = req.user?.id;

  announcementModel.findById(id)
    .then((row) => {
      if (!row) return res.status(404).json({ success: false, message: 'Announcement not found', code: 'NOT_FOUND' });
      return announcementModel.delete(id);
    })
    .then(() => {
      logAudit && logAudit('announcement.delete', userId, { announcementId: id });
      res.json({ success: true, message: 'Announcement deleted successfully' });
    })
    .catch((err) => sendError(res, err, 'Failed to delete announcement'));
}

module.exports = {
  listAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};

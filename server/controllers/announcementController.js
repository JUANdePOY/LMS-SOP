const announcementModel = require('../models/announcementModel');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');
const { broadcastSystemChange } = require('../services/notificationService');
const { getAnnouncementTargetUserIds } = require('../services/notificationTargetService');
const db = require('../config/database');

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

function getAnnouncementBusinessFilter(user) {
  if (user?.role === 'super_admin') {
    return { business_id: null };
  }
  const businessId = user?.business_id;
  if (!businessId) {
    return { business_id: null, denied: true };
  }
  return { business_id: businessId };
}

// Ensure a referenced business actually exists before using it as the FK.
// Announcements allow a NULL business_id (global), so an invalid/missing id is
// safely downgraded to NULL instead of triggering a foreign key error.
async function resolveBusinessId(businessId) {
  if (businessId == null || businessId === '') return null;
  const id = Number(businessId);
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const [rows] = await db.query('SELECT id FROM businesses WHERE id = ? LIMIT 1', [id]);
    return rows.length > 0 ? id : null;
  } catch {
    return null;
  }
}

function listAnnouncements(req, res) {
  const { type, priority, status, page = 1, limit = 20, target_role, target_department } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const { business_id, denied } = getAnnouncementBusinessFilter(req.user);

  if (denied) {
    return res.json({
      success: true,
      message: 'OK',
      data: [],
      pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
    });
  }

  announcementModel.findAll({ business_id, type, priority, status, target_role, target_department, page: pageNum, limit: limitNum })
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
    .catch((err) => sendError(res, err, 'Failed to list announcements'));
}

function getAnnouncement(req, res) {
  const { id } = req.params;
  announcementModel.findById(id)
    .then((row) => {
      if (!row) return res.status(404).json({ success: false, message: 'Announcement not found', code: 'NOT_FOUND' });
      if (req.user?.role !== 'super_admin') {
        if (row.business_id && row.business_id !== req.user?.business_id) {
          return res.status(403).json({ success: false, message: 'Access denied: announcement is outside your business scope', code: 'BUSINESS_SCOPE_DENIED' });
        }
        if (!row.business_id && !req.user?.business_id) {
          return res.status(403).json({ success: false, message: 'Access denied: announcement is outside your business scope', code: 'BUSINESS_SCOPE_DENIED' });
        }
      }
      res.json({ success: true, message: 'OK', data: row });
    })
    .catch((err) => sendError(res, err, 'Failed to load announcement'));
}

function createAnnouncement(req, res) {
  const userId = req.user?.id;
  const { title, type, priority, status, body, business_id, target_departments } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Title is required', code: 'VALIDATION_ERROR' });
  }
  if (!body || !body.trim()) {
    return res.status(400).json({ success: false, message: 'Body is required', code: 'VALIDATION_ERROR' });
  }

  let effectiveBusinessId = business_id ? Number(business_id) : null;
  if (req.user?.role !== 'super_admin') {
    effectiveBusinessId = req.user?.business_id || null;
  }

  const parsedTargetDepartments = Array.isArray(target_departments) ? target_departments.map(String) : null;

  announcementModel.create({
    title: title.trim(),
    type: type || 'General',
    priority: priority || 'medium',
    status: status || 'active',
    author: req.user?.full_name || 'System',
    body: body.trim(),
    business_id: effectiveBusinessId,
    target_roles: null,
    target_departments: parsedTargetDepartments,
  })
    .then((row) => {
      logAudit && logAudit('announcement.create', userId, { announcementId: row.id });
      broadcastSystemChange({
        title: 'New Announcement',
        body: title.trim(),
        type: 'info',
        link: '/announcements',
        entityType: 'announcement',
        entityId: row.id,
        targetUserIds: getAnnouncementTargetUserIds(effectiveBusinessId, parsedTargetDepartments),
      }).catch(() => {});
      res.status(201).json({ success: true, message: 'Announcement created successfully', data: row });
    })
    .catch((err) => sendError(res, err, 'Failed to create announcement'));
}

function updateAnnouncement(req, res) {
  const { id } = req.params;
  const userId = req.user?.id;
  const { title, type, priority, status, body, business_id, target_departments } = req.body;

  announcementModel.findById(id)
    .then((row) => {
      if (!row) return res.status(404).json({ success: false, message: 'Announcement not found', code: 'NOT_FOUND' });
      if (req.user?.role !== 'super_admin' && row.business_id && row.business_id !== req.user?.business_id) {
        return res.status(403).json({ success: false, message: 'Access denied: announcement is outside your business scope', code: 'BUSINESS_SCOPE_DENIED' });
      }

      let effectiveBusinessId = business_id ? Number(business_id) : row.business_id;
      if (req.user?.role !== 'super_admin') {
        effectiveBusinessId = req.user?.business_id || row.business_id;
      }

      const parsedTargetDepartments = Array.isArray(target_departments) ? target_departments.map(String) : row.target_departments;

      return announcementModel.update(id, {
        title: title?.trim() || row.title,
        type: type || row.type,
        priority: priority || row.priority,
        status: status || row.status,
        author: row.author,
        body: body?.trim() || row.body,
        business_id: effectiveBusinessId,
        target_roles: null,
        target_departments: parsedTargetDepartments,
      });
    })
    .then((row) => {
      logAudit && logAudit('announcement.update', userId, { announcementId: id });
      broadcastSystemChange({
        title: 'Announcement Updated',
        body: row.title,
        type: 'info',
        link: '/announcements',
        entityType: 'announcement',
        entityId: row.id,
        targetUserIds: getAnnouncementTargetUserIds(row.business_id, row.target_departments),
      }).catch(() => {});
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
      if (req.user?.role !== 'super_admin' && row.business_id && row.business_id !== req.user?.business_id) {
        return res.status(403).json({ success: false, message: 'Access denied: announcement is outside your business scope', code: 'BUSINESS_SCOPE_DENIED' });
      }
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

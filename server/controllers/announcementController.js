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

async function getAnnouncementBusinessFilter(user) {
  if (user?.role === 'super_admin') {
    return { business_id: null };
  }
  let businessId = user?.business_id;
  if (!businessId && user?.role === 'department_head' && user?.department_id) {
    try {
      const [[dept]] = await db.query('SELECT business_id FROM departments WHERE id = ?', [user.department_id]);
      businessId = dept?.business_id || null;
    } catch {
      businessId = null;
    }
  }
  if (!businessId) {
    return { business_id: null, denied: true };
  }
  return { business_id: businessId };
}

async function getUserBusinessId(user) {
  if (user?.business_id) return user.business_id;
  if (user?.role === 'department_head' && user?.department_id) {
    try {
      const [[dept]] = await db.query('SELECT business_id FROM departments WHERE id = ?', [user.department_id]);
      return dept?.business_id || null;
    } catch {
      return null;
    }
  }
  return null;
}

async function listAnnouncements(req, res) {
  const { type, priority, status, page = 1, limit = 20, target_role, target_department } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const { business_id, denied } = await getAnnouncementBusinessFilter(req.user);

  if (denied) {
    return res.json({
      success: true,
      message: 'OK',
      data: [],
      pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
    });
  }

  try {
    const rows = await announcementModel.findAll({ business_id, type, priority, status, target_role, target_department, page: pageNum, limit: limitNum });
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
  } catch (err) {
    sendError(res, err, 'Failed to list announcements');
  }
}

async function getAnnouncement(req, res) {
  const { id } = req.params;
  const effectiveBusinessId = await getUserBusinessId(req.user);
  const row = await announcementModel.findById(id);
  if (!row) return res.status(404).json({ success: false, message: 'Announcement not found', code: 'NOT_FOUND' });
  if (req.user?.role !== 'super_admin') {
    if (row.business_id && row.business_id !== effectiveBusinessId) {
      return res.status(403).json({ success: false, message: 'You don\'t have access to this announcement.', code: 'BUSINESS_SCOPE_DENIED' });
    }
    if (!row.business_id && !effectiveBusinessId) {
      return res.status(403).json({ success: false, message: 'You don\'t have access to this announcement.', code: 'BUSINESS_SCOPE_DENIED' });
    }
  }
  res.json({ success: true, message: 'OK', data: row });
}

async function createAnnouncement(req, res) {
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
    if (!effectiveBusinessId) {
      effectiveBusinessId = await getUserBusinessId(req.user);
    }
  }

  const parsedTargetDepartments = Array.isArray(target_departments) ? target_departments.map(String) : null;

  try {
    const row = await announcementModel.create({
      title: title.trim(),
      type: type || 'General',
      priority: priority || 'medium',
      status: status || 'active',
      author: req.user?.full_name || 'System',
      body: body.trim(),
      business_id: effectiveBusinessId,
      target_roles: null,
      target_departments: parsedTargetDepartments,
    });
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
  } catch (err) {
    sendError(res, err, 'Failed to create announcement');
  }
}

async function updateAnnouncement(req, res) {
  const { id } = req.params;
  const userId = req.user?.id;
  const { title, type, priority, status, body, business_id, target_departments } = req.body;
  const effectiveBusinessId = await getUserBusinessId(req.user);

  const row = await announcementModel.findById(id);
  if (!row) return res.status(404).json({ success: false, message: 'Announcement not found', code: 'NOT_FOUND' });
  if (req.user?.role !== 'super_admin' && row.business_id && row.business_id !== effectiveBusinessId) {
    return res.status(403).json({ success: false, message: "You don't have access to this announcement.", code: 'BUSINESS_SCOPE_DENIED' });
  }

  let finalBusinessId = business_id ? Number(business_id) : row.business_id;
  if (req.user?.role !== 'super_admin') {
    finalBusinessId = effectiveBusinessId || row.business_id;
  }

  const parsedTargetDepartments = Array.isArray(target_departments) ? target_departments.map(String) : row.target_departments;

  try {
    const updated = await announcementModel.update(id, {
      title: title?.trim() || row.title,
      type: type || row.type,
      priority: priority || row.priority,
      status: status || row.status,
      author: row.author,
      body: body?.trim() || row.body,
      business_id: finalBusinessId,
      target_roles: null,
      target_departments: parsedTargetDepartments,
    });
    logAudit && logAudit('announcement.update', userId, { announcementId: id });
    broadcastSystemChange({
      title: 'Announcement Updated',
      body: updated.title,
      type: 'info',
      link: '/announcements',
      entityType: 'announcement',
      entityId: id,
      targetUserIds: getAnnouncementTargetUserIds(updated.business_id, updated.target_departments),
    }).catch(() => {});
    res.json({ success: true, message: 'Announcement updated successfully', data: updated });
  } catch (err) {
    sendError(res, err, 'Failed to update announcement');
  }
}

async function deleteAnnouncement(req, res) {
  const { id } = req.params;
  const userId = req.user?.id;
  const effectiveBusinessId = await getUserBusinessId(req.user);

  const row = await announcementModel.findById(id);
  if (!row) return res.status(404).json({ success: false, message: 'Announcement not found', code: 'NOT_FOUND' });
  if (req.user?.role !== 'super_admin' && row.business_id && row.business_id !== effectiveBusinessId) {
    return res.status(403).json({ success: false, message: "You don't have access to this announcement.", code: 'BUSINESS_SCOPE_DENIED' });
  }

  try {
    await announcementModel.delete(id);
    logAudit && logAudit('announcement.delete', userId, { announcementId: id });
    res.json({ success: true, message: 'Announcement deleted successfully' });
  } catch (err) {
    sendError(res, err, 'Failed to delete announcement');
  }
}

module.exports = {
  listAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const taskService = require('../services/taskService');
const authModel = require('../models/authModel');
const departmentModel = require('../models/departmentModel');
const enrollmentModel = require('../models/enrollmentModel');
const messageModel = require('../models/messageModel');
const announcementModel = require('../models/announcementModel');
const eventModel = require('../models/eventModel');
const sopService = require('../services/sopService');

function sendError(res, err, fallback = 'Request failed') {
  const code = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const message = err.statusCode ? err.message : fallback;
  const body = { success: false, message };
  if (code === 500) console.error('[AdminDashboard Error]', err);
  return res.status(code).json(body);
}

async function getUserBusinessId(userId) {
  const [rows] = await db.query('SELECT business_id FROM users WHERE id = ? LIMIT 1', [userId]);
  return rows[0]?.business_id || null;
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    const role = req.user?.role;
    if (!['super_admin', 'admin', 'department_head'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Access denied', code: 'FORBIDDEN' });
    }

    const businessId = await getUserBusinessId(req.user.id);

    const [
      userStats,
      taskStats,
      departmentRows,
      recentEnrollments,
      recentMessages,
      announcements,
      events,
    ] = await Promise.all([
      authModel.getStats(),
      taskService.getTaskStats({}, req.user.id).catch(() => ({ total: 0, pending: 0, in_progress: 0, completed: 0, overdue: 0 })),
      departmentModel.findAll({ business_id: businessId, status: 'active', limit: 100 }).catch(() => ({ rows: [] })),
      enrollmentModel.listEnrollments({ business_id: businessId, limit: 100, page: 1 }).catch(() => []),
      messageModel.listConversations(req.user.id).catch(() => []),
      announcementModel.findAll({ business_id: businessId || undefined, status: 'active', limit: 5 }).catch(() => []),
      eventModel.findAll({ business_id: businessId || undefined, status: 'active', limit: 5 }).catch(() => []),
    ]);

    const departments = departmentRows.rows || departmentRows || [];

    const departmentPerformance = departments.map((dept) => {
      const totalUsers = Number(dept.user_count) || 0;
      const avgCompletion = recentEnrollments
        .filter((e) => e.department_id === dept.id)
        .reduce((sum, e, _, arr) => sum + (arr.length ? Number(e.progress_percentage || 0) / arr.length : 0), 0);
      return {
        department: dept.name,
        totalUsers,
        trainingCompletion: Math.round(avgCompletion) || 0,
        assessmentsPassed: 0,
        sopsRead: 0,
        certificatesIssued: 0,
      };
    });

    const uniqueUsers = new Set(recentEnrollments.map((e) => e.user_id));
    const activeLearners = uniqueUsers.size;
    const completedEnrollments = recentEnrollments.filter((e) => Number(e.progress_percentage || 0) >= 100).length;
    const avgProgress = recentEnrollments.length > 0
      ? Math.round(recentEnrollments.reduce((sum, e) => sum + Number(e.progress_percentage || 0), 0) / recentEnrollments.length)
      : 0;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentMessagesList = (recentMessages || [])
      .filter((m) => new Date(m.last_message_at || m.updated_at || m.created_at) >= thirtyDaysAgo)
      .sort((a, b) => new Date(b.last_message_at || m.updated_at || m.created_at) - new Date(a.last_message_at || m.updated_at || m.created_at))
      .slice(0, 5);

    const normalizedAnnouncements = (Array.isArray(announcements) ? announcements : []).map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      type: item.type,
      priority: item.priority,
      status: item.status,
      created_at: item.created_at,
    }));

    const normalizedEvents = (Array.isArray(events) ? events : []).map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      event_type: item.event_type,
      priority: item.priority,
      status: item.status,
      event_date: item.event_date,
      created_at: item.created_at,
    }));

    // Real SOP statistics grouped by category for the "SOPs by Category" card.
    const sopStatsRows = await sopService.getSopStats().catch(() => []);
    const sopTotal = sopStatsRows.reduce((sum, r) => sum + Number(r.count || 0), 0);
    const sopPublished = sopStatsRows
      .filter((r) => r.status === 'Published')
      .reduce((sum, r) => sum + Number(r.count || 0), 0);

    const [sopByCategoryRows] = await db
      .query(
        `SELECT c.name AS category_name, COUNT(s.id) AS count
         FROM sops s
         LEFT JOIN categories c ON s.category_id = c.id
         WHERE (s.is_deleted = 0 OR s.is_deleted IS NULL)
         GROUP BY c.name
         ORDER BY count DESC`
      )
      .catch(() => [[]]);
    const sopByCategory = (sopByCategoryRows || [])
      .map((r) => ({
        name: r.category_name || 'Uncategorized',
        count: Number(r.count) || 0,
        value: Number(r.count) || 0,
      }))
      .filter((c) => c.count > 0);

    res.json({
      success: true,
      message: 'OK',
      data: {
        users: {
          total: Number(userStats.total) || 0,
          active: Number(userStats.active) || 0,
          admins: Number(userStats.admins) || 0,
          employees: Number(userStats.employees) || 0,
        },
        sops: {
          total: sopTotal,
          published: sopPublished,
          byCategory: sopByCategory,
        },
        tasks: {
          total: Number(taskStats.total) || 0,
          todo: Number(taskStats.pending) || 0,
          in_progress: Number(taskStats.in_progress) || 0,
          completed: Number(taskStats.completed) || 0,
          overdue: Number(taskStats.overdue) || 0,
        },
        training: {
          active_learners: activeLearners,
          completed_courses: completedEnrollments,
          avg_progress: avgProgress,
          total_enrollments: recentEnrollments.length,
        },
        departments: {
          total: departments.length,
          performance: departmentPerformance,
        },
        messages: recentMessagesList.map((m) => ({
          id: m.id,
          subject: m.subject || 'No subject',
          last_message_at: m.last_message_at || m.updated_at || m.created_at,
          last_message_body: m.last_message_body || '',
          participant_count: m.participant_count || 0,
        })),
        announcements: normalizedAnnouncements,
        events: normalizedEvents,
      },
    });
  } catch (error) {
    sendError(res, error, 'Failed to load admin dashboard');
  }
});

module.exports = router;

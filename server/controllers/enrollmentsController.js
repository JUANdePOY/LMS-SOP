const enrollmentModel = require('../models/enrollmentModel');
const courseModel = require('../models/courseModel');
const lessonProgressModel = require('../models/lessonProgressModel');
const departmentModel = require('../models/departmentModel');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');
const { createSystemNotification } = require('../services/notificationService');

function sendError(res, err, fallback = 'Request failed') {
  const code = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const message = err.statusCode ? err.message : fallback;
  const body = { success: false, message };
  if (process.env.NODE_ENV !== 'production' && code === 500 && err && typeof err === 'object') {
    if (err.message && err.message !== message) body.details = err.message;
    if (err.sqlMessage) body.sqlMessage = err.sqlMessage;
    if (err.code) body.code = err.code;
  }
  if (code === 500) console.error('[Enrollments Controller Error]', err);
  return res.status(code).json(body);
}

function listEnrollments(req, res) {
  const { course_id, user_id, status, role, page, limit } = req.query;
  const pageNum = parseInt(page || '1', 10);
  const limitNum = parseInt(limit || '20', 10);

  const isAdmin = ['super_admin', 'admin', 'department_head'].includes(req.user?.role);
  const effectiveBusinessId = isAdmin ? req.user?.business_id : null;

  Promise.all([
    enrollmentModel.listEnrollments({ course_id, user_id: isAdmin ? user_id : req.user?.id, status, role, page: pageNum, limit: limitNum, business_id: effectiveBusinessId }),
    enrollmentModel.listEnrollments({ course_id, user_id: isAdmin ? user_id : req.user?.id, status, role, business_id: effectiveBusinessId }),
  ])
    .then(([data, allData]) => {
      res.json({
        success: true,
        message: 'OK',
        data,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: allData.length,
          totalPages: Math.ceil(allData.length / limitNum) || 1,
        },
      });
    })
    .catch((err) => sendError(res, err, 'Failed to list enrollments'));
}

function getEnrollment(req, res) {
  enrollmentModel.findById(parseInt(req.params.id, 10))
    .then((enrollment) => {
      if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
      return res.json({ success: true, message: 'OK', data: enrollment });
    })
    .catch((err) => sendError(res, err, 'Failed to load enrollment'));
}

async function enrollStudent(req, res) {
  const userId = req.user?.id;
  const { course_id, user_id, role, status } = req.body;

  if (!course_id || !user_id) {
    return res.status(400).json({ success: false, message: 'course_id and user_id are required', code: 'VALIDATION_ERROR' });
  }

  try {
    const course = await courseModel.findById(course_id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const existing = await enrollmentModel.findByCourseAndUser(course_id, user_id);
    if (existing) {
      return res.status(409).json({ success: false, message: 'User is already enrolled in this course', code: 'ALREADY_ENROLLED' });
    }

    const id = await enrollmentModel.create({
      course_id,
      user_id,
      role: role || 'learner',
      status: status || 'active',
    });

    const lessonIds = await lessonProgressModel.getAllLessonIds(course_id);
    if (lessonIds.length > 0) {
      await lessonProgressModel.bulkInitialize(user_id, course_id, lessonIds);
    }

    logAudit('enrollment.create', userId, { enrollmentId: id, course_id, user_id });
    createSystemNotification({
      userId: user_id,
      title: 'You have been enrolled in a new course',
      body: course.title,
      type: 'info',
      link: '/my-learning',
      entityType: 'enrollment',
      entityId: id,
    }).catch(() => {});
    return res.status(201).json({ success: true, message: 'Student enrolled successfully', data: { id } });
  } catch (err) {
    sendError(res, err, 'Failed to enroll student');
  }
}

function bulkEnroll(req, res) {
  const userId = req.user?.id;
  const { course_id, user_ids, role } = req.body;

  if (!course_id || !user_ids || !Array.isArray(user_ids) || !user_ids.length) {
    return res.status(400).json({ success: false, message: 'course_id and user_ids array are required', code: 'VALIDATION_ERROR' });
  }

  courseModel.findById(course_id)
    .then((course) => {
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      const enrollments = user_ids.map((uid) => ({ course_id, user_id: uid, role: role || 'learner', status: 'active' }));
      return enrollmentModel.bulkCreate(enrollments).then((ids) => ({ ids, course }));
    })
    .then(({ ids, course }) => {
      logAudit('enrollment.bulk_create', userId, { course_id, count: ids.length });
      ids.forEach((enrollmentId, index) => {
        const uid = user_ids[index];
        if (uid) {
          createSystemNotification({
            userId: uid,
            title: 'You have been enrolled in a new course',
            body: course.title,
            type: 'info',
            link: '/my-learning',
            entityType: 'enrollment',
            entityId: enrollmentId,
          }).catch(() => {});
        }
      });
      return res.status(201).json({ success: true, message: `${ids.length} students enrolled successfully`, data: { ids } });
    })
    .catch((err) => sendError(res, err, 'Failed to bulk enroll students'));
}

async function bulkEnrollByDepartment(req, res) {
  const userId = req.user?.id;
  const { course_id, role } = req.body;
  const departmentId = parseInt(req.params.department_id, 10);

  if (!course_id) {
    return res.status(400).json({ success: false, message: 'course_id is required', code: 'VALIDATION_ERROR' });
  }
  if (!departmentId || Number.isNaN(departmentId)) {
    return res.status(400).json({ success: false, message: 'Valid department_id is required', code: 'VALIDATION_ERROR' });
  }

  try {
    const course = await courseModel.findById(course_id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const users = await departmentModel.getUsers(departmentId);
    const activeUserIds = users.filter((u) => u.is_active).map((u) => u.id);
    if (!activeUserIds.length) {
      return res.status(400).json({ success: false, message: 'No active users found in this department', code: 'NO_USERS' });
    }

    const existingUserIds = await enrollmentModel.findExistingUserIds(course_id, activeUserIds);
    const newUserIds = activeUserIds.filter((id) => !existingUserIds.includes(id));
    if (!newUserIds.length) {
      return res.status(409).json({ success: false, message: 'All active department users are already enrolled in this course', code: 'ALREADY_ENROLLED' });
    }

    const enrollments = newUserIds.map((uid) => ({ course_id, user_id: uid, role: role || 'learner', status: 'active' }));
    const ids = await enrollmentModel.bulkCreate(enrollments);

    logAudit('enrollment.bulk_create_by_department', userId, { course_id, department_id: departmentId, count: ids.length });
    ids.forEach((enrollmentId, index) => {
      const uid = newUserIds[index];
      if (uid) {
        createSystemNotification({
          userId: uid,
          title: 'You have been enrolled in a new course',
          body: course.title,
          type: 'info',
          link: '/my-learning',
          entityType: 'enrollment',
          entityId: enrollmentId,
        }).catch(() => {});
      }
    });
    return res.status(201).json({ success: true, message: `${ids.length} students enrolled successfully`, data: { ids } });
  } catch (err) {
    sendError(res, err, 'Failed to bulk enroll by department');
  }
}

function unenrollStudent(req, res) {
  const userId = req.user?.id;
  const enrollmentId = parseInt(req.params.id, 10);

  enrollmentModel.findById(enrollmentId)
    .then((enrollment) => {
      if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
      return enrollmentModel.softDelete(enrollmentId).then(() => {
        logAudit('enrollment.delete', userId, { enrollmentId, course_id: enrollment.course_id });
        return res.json({ success: true, message: 'Student unenrolled successfully' });
      });
    })
    .catch((err) => sendError(res, err, 'Failed to unenroll student'));
}

function updateEnrollmentStatus(req, res) {
  const enrollmentId = parseInt(req.params.id, 10);
  const userId = req.user?.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'status is required', code: 'VALIDATION_ERROR' });
  }

  enrollmentModel.findById(enrollmentId)
    .then((enrollment) => {
      if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
      return enrollmentModel.update(enrollmentId, { status }).then(async () => {
        logAudit('enrollment.status_update', userId, { enrollmentId, status });

        if (status === 'completed') {
          try {
            const { autoIssueOnCompletion } = require('../services/certificateAutoIssuanceService');
            const result = await autoIssueOnCompletion(enrollment.course_id, enrollment.user_id, enrollmentId, userId);
            if (result.issued) {
              return res.json({ success: true, message: 'Enrollment status updated', certificateIssued: true, certificate: result.issuance });
            }
          } catch (err) {
            console.error('Auto certificate issuance failed:', err.message);
          }
        }

        return res.json({ success: true, message: 'Enrollment status updated' });
      });
    })
    .catch((err) => sendError(res, err, 'Failed to update enrollment status'));
}

function approveEnrollment(req, res) {
  const enrollmentId = parseInt(req.params.id, 10);
  const userId = req.user?.id;

  enrollmentModel.findById(enrollmentId)
    .then((enrollment) => {
      if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
      return enrollmentModel.update(enrollmentId, { status: 'active' }).then(() => {
        logAudit('enrollment.approve', userId, { enrollmentId });
        return res.json({ success: true, message: 'Enrollment approved' });
      });
    })
    .catch((err) => sendError(res, err, 'Failed to approve enrollment'));
}

function rejectEnrollment(req, res) {
  const enrollmentId = parseInt(req.params.id, 10);
  const userId = req.user?.id;
  const { reason } = req.body;

  enrollmentModel.findById(enrollmentId)
    .then((enrollment) => {
      if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
      return enrollmentModel.update(enrollmentId, { status: 'dropped' }).then(() => {
        logAudit('enrollment.reject', userId, { enrollmentId, reason });
        return res.json({ success: true, message: 'Enrollment rejected' });
      });
    })
    .catch((err) => sendError(res, err, 'Failed to reject enrollment'));
}

function getClassProgress(req, res) {
  const courseId = parseInt(req.params.courseId, 10);

  courseModel.findById(courseId)
    .then((course) => {
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      return enrollmentModel.getClassProgress(courseId);
    })
    .then((progress) => {
      res.json({ success: true, message: 'OK', data: progress });
    })
    .catch((err) => sendError(res, err, 'Failed to get class progress'));
}

module.exports = {
  listEnrollments,
  getEnrollment,
  enrollStudent,
  bulkEnroll,
  bulkEnrollByDepartment,
  unenrollStudent,
  updateEnrollmentStatus,
  approveEnrollment,
  rejectEnrollment,
  getClassProgress,
};

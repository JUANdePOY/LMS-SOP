const db = require('../config/database');
const learningPathModel = require('../models/learningPathModel');
const courseModel = require('../models/courseModel');
const enrollmentModel = require('../models/enrollmentModel');
const { logAudit } = require('../utils/auditLogger');

function sendError(res, err, fallback = 'Request failed') {
  const code = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const message = err.statusCode ? err.message : fallback;
  if (code === 500) console.error('[Learning Path Controller Error]', err);
  return res.status(code).json({ success: false, message });
}

function listPaths(req, res) {
  const { department_id, status } = req.query;
  const businessId = req.user?.business_id || null;
  learningPathModel
    .listPaths({ department_id, status, business_id })
    .then((data) => res.json({ success: true, message: 'OK', data }))
    .catch((err) => sendError(res, err, 'Failed to list learning paths'));
}

function getPath(req, res) {
  const pathId = parseInt(req.params.id, 10);
  Promise.all([
    learningPathModel.findById(pathId),
    learningPathModel.getPathCourses(pathId),
  ])
    .then(([path, courses]) => {
      if (!path) return res.status(404).json({ success: false, message: 'Learning path not found' });
      res.json({ success: true, message: 'OK', data: { ...path, courses } });
    })
    .catch((err) => sendError(res, err, 'Failed to load learning path'));
}

async function createPath(req, res) {
  const userId = req.user?.id;
  const { title, description, department_id, is_active } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Title is required', code: 'VALIDATION_ERROR' });
  }
  try {
    const id = await learningPathModel.create({
      title: title.trim(),
      description,
      department_id: department_id ? parseInt(department_id, 10) : null,
      is_active,
    });
    logAudit('learning_path.create', userId, { pathId: id, title });
    res.status(201).json({ success: true, message: 'Learning path created', data: { id } });
  } catch (err) {
    sendError(res, err, 'Failed to create learning path');
  }
}

async function updatePath(req, res) {
  const pathId = parseInt(req.params.id, 10);
  const userId = req.user?.id;
  const allowed = ['title', 'description', 'department_id', 'is_active'];
  const updates = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      updates[key] = key === 'department_id' ? (req.body[key] ? parseInt(req.body[key], 10) : null) : req.body[key];
    }
  }
  if (!Object.keys(updates).length) {
    return res.status(400).json({ success: false, message: 'No changes provided', code: 'VALIDATION_ERROR' });
  }
  try {
    await learningPathModel.update(pathId, updates);
    logAudit('learning_path.update', userId, { pathId, updates });
    res.json({ success: true, message: 'Learning path updated' });
  } catch (err) {
    sendError(res, err, 'Failed to update learning path');
  }
}

async function addCourse(req, res) {
  const pathId = parseInt(req.params.id, 10);
  const userId = req.user?.id;
  const { course_id, position, is_required } = req.body;
  if (!course_id) {
    return res.status(400).json({ success: false, message: 'course_id is required', code: 'VALIDATION_ERROR' });
  }
  try {
    const course = await courseModel.findById(parseInt(course_id, 10));
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    await learningPathModel.addCourse(pathId, parseInt(course_id, 10), position || 0, is_required ?? 1);
    logAudit('learning_path.course.add', userId, { pathId, courseId: course_id });
    res.json({ success: true, message: 'Course added to path' });
  } catch (err) {
    sendError(res, err, 'Failed to add course to path');
  }
}

async function removeCourse(req, res) {
  const pathId = parseInt(req.params.id, 10);
  const courseId = parseInt(req.params.courseId, 10);
  const userId = req.user?.id;
  try {
    await learningPathModel.removeCourse(pathId, courseId);
    logAudit('learning_path.course.remove', userId, { pathId, courseId });
    res.json({ success: true, message: 'Course removed from path' });
  } catch (err) {
    sendError(res, err, 'Failed to remove course from path');
  }
}

async function assignPath(req, res) {
  const pathId = parseInt(req.params.id, 10);
  const userId = req.user?.id;
  const { user_ids, department_id, role = 'learner' } = req.body;

  let targetUserIds = [];
  try {
    if (Array.isArray(user_ids) && user_ids.length) {
      targetUserIds = user_ids.map((id) => parseInt(id, 10));
    } else if (department_id) {
      const [rows] = await db.query(
        'SELECT id FROM users WHERE department_id = ? AND is_active = TRUE',
        [parseInt(department_id, 10)]
      );
      targetUserIds = rows.map((r) => r.id);
    }

    if (!targetUserIds.length) {
      return res.status(400).json({ success: false, message: 'No users to enroll', code: 'VALIDATION_ERROR' });
    }

    const courses = await learningPathModel.getPathCourses(pathId);
    if (!courses.length) {
      return res.status(400).json({ success: false, message: 'Learning path has no courses', code: 'EMPTY_PATH' });
    }

    let enrolled = 0;
    for (const course of courses) {
      for (const uid of targetUserIds) {
        const existing = await enrollmentModel.findByCourseAndUser(course.id, uid);
        if (!existing) {
          await enrollmentModel.create({ course_id: course.id, user_id: uid, role: role || 'learner', status: 'active' });
          enrolled += 1;
        }
      }
    }

    logAudit('learning_path.assign', userId, { pathId, count: targetUserIds.length, enrolled });
    res.json({ success: true, message: 'Learning path assigned', data: { users: targetUserIds.length, enrollments: enrolled } });
  } catch (err) {
    sendError(res, err, 'Failed to assign learning path');
  }
}

module.exports = {
  listPaths,
  getPath,
  createPath,
  updatePath,
  addCourse,
  removeCourse,
  assignPath,
};


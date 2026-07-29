const gradeModel = require('../models/gradeModel');
const submissionModel = require('../models/submissionModel');
const enrollmentModel = require('../models/enrollmentModel');
const courseModel = require('../models/courseModel');
const quizModel = require('../models/quizModel');
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
  if (code === 500) console.error('[Grades Controller Error]', err);
  return res.status(code).json(body);
}

function listGrades(req, res) {
  const { course_id, user_id, item_id, item_type, is_finalized, page, limit } = req.query;
  const pageNum = parseInt(page || '1', 10);
  const limitNum = parseInt(limit || '50', 10);

  const isAdmin = ['super_admin', 'admin', 'department_head'].includes(req.user?.role);

  Promise.all([
    gradeModel.listGrades({ course_id, user_id: isAdmin ? user_id : req.user?.id, item_id, item_type, is_finalized, page: pageNum, limit: limitNum }),
    gradeModel.listGrades({ course_id, user_id: isAdmin ? user_id : req.user?.id, item_id, item_type, is_finalized }),
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
    .catch((err) => sendError(res, err, 'Failed to list grades'));
}

function getGradebook(req, res) {
  const courseId = parseInt(req.params.courseId, 10);

  courseModel.findById(courseId)
    .then((course) => {
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      return gradeModel.getGradebook(courseId);
    })
    .then((gradebook) => {
      res.json({ success: true, message: 'OK', data: gradebook });
    })
    .catch((err) => sendError(res, err, 'Failed to load gradebook'));
}

function createGrade(req, res) {
  const userId = req.user?.id;
  const { course_id, user_id, item_id, item_type, score, max_score, letter_grade, feedback, is_finalized, is_released } = req.body;

  if (!course_id || !user_id) {
    return res.status(400).json({ success: false, message: 'course_id and user_id are required', code: 'VALIDATION_ERROR' });
  }

  courseModel.findById(course_id)
    .then((course) => {
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      return gradeModel.create({
        course_id,
        user_id,
        item_id,
        item_type: item_type || 'course',
        score: score || 0,
        max_score: max_score || 100,
        letter_grade,
        feedback,
        graded_by: userId,
        is_finalized: is_finalized ?? false,
        is_released: is_released ?? false,
      });
    })
    .then((id) => {
      logAudit('grade.create', userId, { gradeId: id, course_id, user_id });
      return res.status(201).json({ success: true, message: 'Grade created successfully', data: { id } });
    })
    .catch((err) => sendError(res, err, 'Failed to create grade'));
}

function updateGrade(req, res) {
  const gradeId = parseInt(req.params.id, 10);
  const userId = req.user?.id;

  gradeModel.findById(gradeId)
    .then((grade) => {
      if (!grade) return res.status(404).json({ success: false, message: 'Grade not found' });
      const allowed = ['score', 'max_score', 'letter_grade', 'feedback', 'is_finalized', 'is_released'];
      const updates = {};
      for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(req.body, key)) {
          updates[key] = req.body[key];
        }
      }
      if (!Object.keys(updates).length) {
        return res.status(400).json({ success: false, message: 'No changes provided', code: 'VALIDATION_ERROR' });
      }
      if ('score' in updates || 'max_score' in updates) {
        updates.graded_by = userId;
      }
      return gradeModel.update(gradeId, updates).then(() => {
        logAudit('grade.update', userId, { gradeId, updates });
        return res.json({ success: true, message: 'Grade updated successfully' });
      });
    })
    .catch((err) => sendError(res, err, 'Failed to update grade'));
}

function bulkImportGrades(req, res) {
  const userId = req.user?.id;
  const { course_id, grades } = req.body; // grades: [{ user_id, score, max_score, feedback }]

  if (!course_id || !Array.isArray(grades) || !grades.length) {
    return res.status(400).json({ success: false, message: 'course_id and grades array are required', code: 'VALIDATION_ERROR' });
  }

  courseModel.findById(course_id)
    .then((course) => {
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      const promises = grades.map((g) =>
        gradeModel.create({
          course_id,
          user_id: g.user_id,
          item_type: 'course',
          score: g.score || 0,
          max_score: g.max_score || 100,
          feedback: g.feedback,
          graded_by: userId,
        })
      );
      return Promise.all(promises);
    })
    .then((ids) => {
      logAudit('grade.bulk_import', userId, { course_id, count: ids.length });
      return res.status(201).json({ success: true, message: `${ids.length} grades imported successfully`, data: { ids } });
    })
    .catch((err) => sendError(res, err, 'Failed to import grades'));
}

function getGradingRubric(req, res) {
  const gradingId = parseInt(req.params.gradingId, 10);

  gradeModel.findById(gradingId)
    .then((grade) => {
      if (!grade) return res.status(404).json({ success: false, message: 'Grade not found' });
      return res.json({ success: true, message: 'OK', data: { grade } });
    })
    .catch((err) => sendError(res, err, 'Failed to fetch grading rubric'));
}

function createGradingRubric(req, res) {
  // Placeholder for rubric creation
  res.status(501).json({ success: false, message: 'Rubric creation not yet implemented', code: 'NOT_IMPLEMENTED' });
}

function gradeAssignmentSubmission(req, res) {
  const assignmentId = parseInt(req.params.assignmentId, 10);
  const submissionId = parseInt(req.params.submissionId, 10);
  const userId = req.user?.id;
  const { score, feedback } = req.body;

  submissionModel.findById(submissionId)
    .then((submission) => {
      if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
      return submissionModel.update(submissionId, {
        score,
        feedback,
        status: 'graded',
        graded_at: new Date(),
        graded_by: userId,
      });
    })
    .then(() => {
      logAudit('assignment.grade', userId, { assignmentId, submissionId });
      return res.json({ success: true, message: 'Submission graded successfully' });
    })
    .catch((err) => sendError(res, err, 'Failed to grade submission'));
}

function finalizeGrades(req, res) {
  const courseId = parseInt(req.params.courseId, 10);
  const userId = req.user?.id;

  courseModel.findById(courseId)
    .then((course) => {
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      return gradeModel.listGrades({ course_id: courseId, is_finalized: false });
    })
    .then((grades) => {
      const promises = grades.map((g) => gradeModel.update(g.id, { is_finalized: true }));
      return Promise.all(promises);
    })
    .then(() => {
      logAudit('grades.finalize', userId, { courseId });
      return res.json({ success: true, message: 'Grades finalized successfully' });
    })
    .catch((err) => sendError(res, err, 'Failed to finalize grades'));
}

function releaseGrades(req, res) {
  const courseId = parseInt(req.params.courseId, 10);
  const userId = req.user?.id;

  courseModel.findById(courseId)
    .then((course) => {
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      return gradeModel.listGrades({ course_id: courseId, is_finalized: true, is_released: false });
    })
    .then((grades) => {
      const promises = grades.map((g) => gradeModel.update(g.id, { is_released: true }));
      return Promise.all(promises);
    })
    .then(() => {
      logAudit('grades.release', userId, { courseId });
      return res.json({ success: true, message: 'Grades released successfully' });
    })
    .catch((err) => sendError(res, err, 'Failed to release grades'));
}

module.exports = {
  listGrades,
  getGradebook,
  createGrade,
  updateGrade,
  bulkImportGrades,
  getGradingRubric,
  createGradingRubric,
  gradeAssignmentSubmission,
  finalizeGrades,
  releaseGrades,
};

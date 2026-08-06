const sopModel = require('../models/sopModel');
const sopVersionModel = require('../models/sopVersionModel');
const sopModuleModel = require('../models/sopModuleModel');
const sopCourseLinkModel = require('../models/sopCourseLinkModel');
const enrollmentModel = require('../models/enrollmentModel');
const sopAssignmentService = require('../services/sopAssignmentService');
const { logAudit } = require('../utils/auditLogger');

function sendError(res, err, fallback = 'Request failed') {
  const code = err.code || 'INTERNAL_ERROR';
  const status = code === 'NOT_FOUND' ? 404 : code === 'FORBIDDEN' ? 403 : code === 'VALIDATION_ERROR' ? 400 : 500;
  const body = { success: false, message: err.message || fallback, code };
  if (process.env.NODE_ENV !== 'production' && status === 500 && err) {
    body.details = err.message;
  }
  if (status === 500) console.error('[Employee SOP Controller Error]', err);
  return res.status(status).json(body);
}

const ALLOWED_EMPLOYEE_SOP_STATUSES = ['Published'];

async function getEmployeeSop(req, res) {
  try {
    const userId = req.user.id;
    const sopId = parseInt(req.params.id, 10);

    const sop = await sopModel.findById(sopId);
    if (!sop) {
      const error = new Error('SOP not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    if (!ALLOWED_EMPLOYEE_SOP_STATUSES.includes(sop.status)) {
      const error = new Error('This SOP is not available');
      error.code = 'FORBIDDEN';
      throw error;
    }

    let hasAccess = false;

    // 1. Check enrollment in a course that links this SOP
    const hasLink = await sopCourseLinkModel.isLinkedToActiveEnrollment(sopId, userId);
    if (hasLink) {
      hasAccess = true;
    }

    // 2. Check direct SOP assignment
    if (!hasAccess) {
      try {
        const hasAssignment = await sopAssignmentService.isAssignedToUser(sopId, userId);
        if (hasAssignment) hasAccess = true;
      } catch {
        // assignment check failed, continue without it
      }
    }

    if (!hasAccess) {
      const error = new Error('You do not have access to this SOP');
      error.code = 'FORBIDDEN';
      throw error;
    }

    // Load modules
    const versionId = await sopVersionModel.getCurrentVersionId(sopId);
    const modules = await sopModuleModel.listModules(sopId, versionId);

    // Log access
    logAudit({
      user_id: userId,
      action: 'employee.sop.viewed',
      entity_type: 'sop',
      entity_id: sopId,
      metadata: { course_link: hasLink },
    });

    res.json({
      success: true,
      data: {
        ...sop,
        modules,
        current_version_id: versionId,
      },
    });
  } catch (error) {
    sendError(res, error, 'Failed to load SOP');
  }
}

async function listCourseSops(req, res) {
  try {
    const userId = req.user.id;
    const courseId = parseInt(req.params.courseId, 10);

    const enrollment = await enrollmentModel.findByCourseAndUser(courseId, userId);
    if (!enrollment) {
      const error = new Error('You are not enrolled in this course');
      error.code = 'FORBIDDEN';
      throw error;
    }

    const rows = await sopCourseLinkModel.listByCourse(courseId);

    const allowed = rows.filter((row) => ALLOWED_EMPLOYEE_SOP_STATUSES.includes(row.sop_status));

    res.json({ success: true, data: allowed });
  } catch (error) {
    sendError(res, error, 'Failed to list course SOPs');
  }
}

const employeeSopController = {
  getSop: getEmployeeSop,
  listCourseSops,
};

module.exports = employeeSopController;

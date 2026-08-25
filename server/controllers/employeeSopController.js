const sopModel = require('../models/sopModel');
const sopVersionModel = require('../models/sopVersionModel');
const sopModuleModel = require('../models/sopModuleModel');
const enrollmentModel = require('../models/enrollmentModel');
const db = require('../config/database');
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

async function list(req, res) {
  try {
    const userId = req.user.id;
    const search = (req.query.search || '').trim();
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 20, 1);
    const sort = req.query.sort === 'title' ? 'title' : 'created_at';

    const result = await sopAssignmentService.listAccessibleSops(userId, {
      search,
      page,
      limit,
      sort,
    });

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    sendError(res, error, 'Failed to load SOPs');
  }
}

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

    // 1. Check enrollment in a course that embeds this SOP as a lesson
    const [linkedRows] = await db.query(`
      SELECT 1 FROM module_content mc
      JOIN course_modules cm ON cm.id = mc.module_id AND cm.is_deleted = FALSE
      JOIN course_enrollments ce ON ce.course_id = cm.course_id AND ce.user_id = ? AND ce.status IN ('active', 'completed') AND ce.is_deleted = FALSE
      WHERE mc.type = 'sop' AND mc.url = ? AND mc.is_deleted = FALSE
      LIMIT 1
    `, [userId, String(sopId)]);
    if (linkedRows.length > 0) {
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
      metadata: { course_link: hasAccess },
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

async function summary(req, res) {
  try {
    const data = await sopAssignmentService.getEmployeeSopSummary(req.user.id);
    res.json({ success: true, data });
  } catch (error) {
    sendError(res, error, 'Failed to load SOP summary');
  }
}

const employeeSopController = {
  list,
  getSop: getEmployeeSop,
  summary,
};

module.exports = employeeSopController;

const sopCourseLinkModel = require('../models/sopCourseLinkModel');
const courseModel = require('../models/courseModel');
const sopModel = require('../models/sopModel');
const { logAudit } = require('../utils/auditLogger');

async function listCourseSops(courseId, requester) {
  const course = await courseModel.findById(courseId);
  if (!course) {
    const error = new Error('Course not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (requester.role === 'department_head') {
    if (course.department_id !== requester.department_id) {
      const error = new Error('Forbidden - course does not belong to your department');
      error.code = 'FORBIDDEN';
      throw error;
    }
  }

  return sopCourseLinkModel.listByCourse(courseId);
}

const ALLOWED_LINK_STATUSES = ['Published'];

async function linkSopToCourse(courseId, sopId, meta = {}, requester) {
  const course = await courseModel.findById(courseId);
  if (!course) {
    const error = new Error('Course not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const sop = await sopModel.findById(sopId);
  if (!sop) {
    const error = new Error('SOP not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (!ALLOWED_LINK_STATUSES.includes(sop.status)) {
    const error = new Error(`Cannot link SOP with status: ${sop.status}. Only Approved and Published SOPs can be linked.`);
    error.code = 'INVALID_SOP_STATUS';
    throw error;
  }

  if (requester.role === 'department_head') {
    if (course.department_id !== requester.department_id) {
      const error = new Error('Forbidden - course does not belong to your department');
      error.code = 'FORBIDDEN';
      throw error;
    }
  }

  const existing = await sopCourseLinkModel.listByCourseAndSop(courseId, sopId);
  if (existing) {
    const error = new Error('This SOP is already linked to the course');
    error.code = 'DUPLICATE_LINK';
    throw error;
  }

  const linkId = await sopCourseLinkModel.create({
    course_id: courseId,
    sop_id: sopId,
    module_id: meta.module_id || null,
    display_order: meta.display_order ?? 0,
    is_required: meta.is_required ?? false,
    link_type: meta.link_type || 'Reference',
    created_by: requester.id,
  });

  logAudit({
    user_id: requester.id,
    action: 'sop.course_link.created',
    entity_type: 'sop_course_link',
    entity_id: linkId,
    metadata: { course_id: courseId, sop_id: sopId, link_type: meta.link_type || 'Reference' },
  });

  return { id: linkId };
}

async function unlinkSopFromCourse(courseId, sopId, requester) {
  const course = await courseModel.findById(courseId);
  if (!course) {
    const error = new Error('Course not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (requester.role === 'department_head') {
    if (course.department_id !== requester.department_id) {
      const error = new Error('Forbidden - course does not belong to your department');
      error.code = 'FORBIDDEN';
      throw error;
    }
  }

  const existing = await sopCourseLinkModel.listByCourseAndSop(courseId, sopId);
  if (!existing) {
    const error = new Error('SOP is not linked to this course');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const affected = await sopCourseLinkModel.remove(courseId, sopId);

  logAudit({
    user_id: requester.id,
    action: 'sop.course_link.removed',
    entity_type: 'sop_course_link',
    entity_id: existing.id,
    metadata: { course_id: courseId, sop_id: sopId },
  });

  return { affected };
}

module.exports = {
  listCourseSops,
  linkSopToCourse,
  unlinkSopFromCourse,
};

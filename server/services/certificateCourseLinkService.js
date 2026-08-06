const certificateCourseLinkModel = require('../models/certificateCourseLinkModel');
const certificateTemplateModel = require('../models/certificateTemplateModel');
const courseModel = require('../models/courseModel');
const { logAudit } = require('../utils/auditLogger');

async function listCourseCertificates(courseId, requester) {
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

  return certificateCourseLinkModel.listByCourse(courseId);
}

async function linkCertificateToCourse(courseId, templateId, meta = {}, requester) {
  const course = await courseModel.findById(courseId);
  if (!course) {
    const error = new Error('Course not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const template = await certificateTemplateModel.findByIdentifier(templateId);
  if (!template) {
    const error = new Error('Certificate template not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (template.is_deleted) {
    const error = new Error('Certificate template has been deleted');
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

  const existing = await certificateCourseLinkModel.findByCourseAndTemplate(courseId, templateId);
  if (existing) {
    const error = new Error('This certificate template is already linked to the course');
    error.code = 'DUPLICATE_LINK';
    throw error;
  }

  const linkId = await certificateCourseLinkModel.create({
    certificate_template_id: templateId,
    course_id: courseId,
    is_default: meta.is_default ?? true,
    display_order: meta.display_order ?? 0,
    created_by: requester.id,
  });

  logAudit({
    user_id: requester.id,
    action: 'certificate.course_link.created',
    entity_type: 'certificate_course_link',
    entity_id: linkId,
    metadata: { course_id: courseId, certificate_template_id: templateId },
  });

  return { id: linkId };
}

async function unlinkCertificateFromCourse(courseId, templateId, requester) {
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

  const existing = await certificateCourseLinkModel.findByCourseAndTemplate(courseId, templateId);
  if (!existing) {
    const error = new Error('Certificate template is not linked to this course');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const affected = await certificateCourseLinkModel.remove(courseId, templateId);

  logAudit({
    user_id: requester.id,
    action: 'certificate.course_link.removed',
    entity_type: 'certificate_course_link',
    entity_id: existing.id,
    metadata: { course_id: courseId, certificate_template_id: templateId },
  });

  return { affected };
}

async function getDefaultTemplateForCourse(courseId) {
  const link = await certificateCourseLinkModel.findDefaultByCourse(courseId);
  if (!link) return null;
  const template = await certificateTemplateModel.findByIdentifier(link.certificate_template_id);
  return template && !template.is_deleted && template.status === 'active' ? template : null;
}

module.exports = {
  listCourseCertificates,
  linkCertificateToCourse,
  unlinkCertificateFromCourse,
  getDefaultTemplateForCourse,
};

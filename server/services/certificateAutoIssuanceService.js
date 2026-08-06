const courseModel = require('../models/courseModel');
const enrollmentModel = require('../models/enrollmentModel');
const certificateIssuanceModel = require('../models/certificateIssuanceModel');
const certificateCourseLinkService = require('../services/certificateCourseLinkService');
const certificateIssuanceService = require('../services/certificateIssuanceService');
const quizModel = require('../models/quizModel');
const { logAudit } = require('../utils/auditLogger');

async function shouldAutoIssue(courseId, userId, enrollmentId) {
  const course = await courseModel.findById(courseId);
  if (!course) {
    return { shouldIssue: false, reason: 'Course not found' };
  }

  if (!course.send_completion_certificates) {
    return { shouldIssue: false, reason: 'Course does not have completion certificates enabled' };
  }

  const existing = await certificateIssuanceModel.findByEnrollment(enrollmentId);
  if (existing && existing.status === 'active') {
    return { shouldIssue: false, reason: 'Certificate already issued for this enrollment' };
  }

  const quizzes = await quizModel.listQuizzes(courseId, { status: 'published' });
  if (quizzes.length > 0) {
    const unpublished = await quizModel.listQuizzes(courseId, { status: 'draft' });
    if (unpublished.length > 0) {
      return { shouldIssue: false, reason: 'Course has unpublished quizzes' };
    }

    for (const quiz of quizzes) {
      const best = await quizModel.getBestAttempt(quiz.id, userId);
      if (!best || best.status !== 'completed' || best.passed !== 1) {
        return { shouldIssue: false, reason: `Quiz "${quiz.title}" not passed` };
      }
    }
  }

  return { shouldIssue: true, course, enrollmentId };
}

async function autoIssueOnCompletion(courseId, userId, enrollmentId, actorId, overrides = {}) {
  const check = await shouldAutoIssue(courseId, userId, enrollmentId);
  if (!check.shouldIssue) {
    return { issued: false, reason: check.reason };
  }

  const template = await certificateCourseLinkService.getDefaultTemplateForCourse(courseId);
  if (!template) {
    return { issued: false, reason: 'No certificate template linked to this course' };
  }

  const enrollment = await enrollmentModel.findById(enrollmentId);
  if (!enrollment) {
    return { issued: false, reason: 'Enrollment not found' };
  }

  const defaultOverrides = {
    recipient_name: overrides.recipient_name || undefined,
    date: overrides.date || new Date().toISOString().split('T')[0],
  };

  const issuance = await certificateIssuanceService.issueCertificate(
    {
      template_id: template.id,
      user_id: userId,
      course_id: courseId,
      enrollment_id: enrollmentId,
      verification_code: overrides.verification_code || undefined,
      overrides: defaultOverrides,
    },
    actorId
  );

  logAudit({
    user_id: actorId,
    action: 'certificate.auto_issued',
    entity_type: 'certificate_issuance',
    entity_id: issuance.id,
    metadata: {
      course_id: courseId,
      user_id: userId,
      enrollment_id: enrollmentId,
      certificate_number: issuance.certificate_number,
    },
  });

  return { issued: true, issuance };
}

module.exports = {
  shouldAutoIssue,
  autoIssueOnCompletion,
};

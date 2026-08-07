const db = require('../config/database');
const courseModel = require('../models/courseModel');
const enrollmentModel = require('../models/enrollmentModel');
const certificateTemplateModel = require('../models/certificateTemplateModel');
const certificateCourseLinkModel = require('../models/certificateCourseLinkModel');
const certificateIssuanceModel = require('../models/certificateIssuanceModel');
const quizModel = require('../models/quizModel');
const certificateAutoIssuanceService = require('../services/certificateAutoIssuanceService');
const certificateCourseLinkService = require('../services/certificateCourseLinkService');
const fs = require('fs');
const path = require('path');

const MINIMAL_SECTIONS = {
  title: { text: 'Certificate of Completion', x_percent: 50, y_percent: 14, font_size: 44, font_weight: 'bold', font_style: 'normal', font_family: 'Georgia, serif', line_height: 1.1, width_percent: 85, text_align: 'center', title_second_font_size: 32, title_second_font_weight: 'normal', title_second_font_style: 'normal' },
  presentation_line: { text: 'This certificate is proudly presented to', x_percent: 50, y_percent: 23, font_size: 16, font_weight: 'normal', font_style: 'normal', font_family: 'Inter, sans-serif', line_height: 1.3, width_percent: 70, text_align: 'center' },
  recipient_name: { text: '', x_percent: 50, y_percent: 47, font_size: 40, font_weight: 'normal', font_style: 'normal', font_family: 'Brush Script MT, cursive', line_height: 1.15, width_percent: 80, text_align: 'center' },
  description: { text: 'For successfully completing the course', x_percent: 50, y_percent: 63, font_size: 15, font_weight: 'normal', font_style: 'normal', font_family: 'Inter, sans-serif', line_height: 1.2, width_percent: 62, text_align: 'center' },
  date: { text: '', x_percent: 50, y_percent: 85, font_size: 13, font_weight: 'normal', font_style: 'normal', font_family: 'Inter, sans-serif', line_height: 1.3, width_percent: 32, text_align: 'center' },
  signatures_seal: { text: '', x_percent: 84, y_percent: 85, font_size: 13, font_weight: 'normal', font_style: 'normal', font_family: 'Inter, sans-serif', line_height: 1.3, width_percent: 32, text_align: 'center', items: [], signer_name: '', position_title: '', image_size: 48 },
};

// Minimal valid 1x1 transparent PNG
const MINIMAL_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
]);

const FRAME_DIR = path.join(__dirname, '..', 'uploads', 'certificates', 'templates');
const FRAME_PATH = path.join(FRAME_DIR, 'frame.png');

function ensureFrameFile() {
  if (!fs.existsSync(FRAME_DIR)) {
    fs.mkdirSync(FRAME_DIR, { recursive: true });
  }
  if (!fs.existsSync(FRAME_PATH)) {
    fs.writeFileSync(FRAME_PATH, MINIMAL_PNG);
  }
}

beforeAll(() => {
  ensureFrameFile();
});

afterAll(() => {
  if (fs.existsSync(FRAME_PATH)) {
    fs.unlinkSync(FRAME_PATH);
  }
});

async function createTestTemplate(name = 'Auto-Issue Test Template') {
  const publicId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const id = await certificateTemplateModel.create({
    public_id: publicId,
    name,
    department_id: null,
    frame_filename: 'frame.png',
    frame_storage_path: 'certificates/templates/frame.png',
    orientation: 'landscape',
    width_px: 1123,
    height_px: 794,
    sections: MINIMAL_SECTIONS,
    status: 'active',
    created_by: 1,
  });
  return { id, publicId };
}

async function createTestCourse(userId = 4, opts = {}) {
  const courseId = await courseModel.create({
    title: opts.title || `Auto-Issue Test Course ${Date.now()}`,
    description: opts.description || 'Test course for auto-issuance',
    difficulty: 'beginner',
    status: 'published',
    instructor_id: userId,
    allow_self_enrollment: true,
    send_completion_certificates: opts.send_completion_certificates ?? true,
    department_id: opts.department_id || 1,
  });
  return courseId;
}

async function createTestEnrollment(courseId, userId, status = 'active') {
  const id = await enrollmentModel.create({
    course_id: courseId,
    user_id: userId,
    role: 'student',
    status,
  });
  return id;
}

async function createTestQuiz(courseId, opts = {}) {
  const quizId = await quizModel.create({
    course_id: courseId,
    module_id: null,
    title: opts.title || 'Test Quiz',
    description: opts.description || 'Test quiz for auto-issuance',
    time_limit: 10,
    max_score: 100,
    attempts_allowed: 1,
    passing_score: 70,
    status: opts.status || 'published',
    quiz_type: 'practice',
    randomize_questions: false,
    shuffle_options: false,
    grading_method: 'auto',
  });
  return quizId;
}

async function createPassedAttempt(quizId, userId) {
  const attemptId = await quizModel.createAttempt({
    quiz_id: quizId,
    user_id: userId,
    attempt_number: 1,
    answers: {},
    time_limit_sec: 600,
  });
  await quizModel.updateAttempt(attemptId, {
    status: 'completed',
    score: 80,
    max_score: 100,
    percentage: 80.0,
    passed: true,
    submitted_at: new Date(),
    time_taken_sec: 540,
  });
  return attemptId;
}

async function cleanup(courseId, templateId, enrollmentId) {
  const conn = await db.getConnection();
  try {
    await conn.query('DELETE FROM certificate_issuances WHERE course_id = ?', [courseId]);
    await conn.query('DELETE FROM certificate_course_links WHERE course_id = ? AND certificate_template_id = ?', [courseId, templateId]);
    await conn.query('DELETE FROM course_enrollments WHERE id = ?', [enrollmentId]);
    await conn.query('DELETE FROM courses WHERE id = ?', [courseId]);
    await conn.query('DELETE FROM certificate_templates WHERE id = ?', [templateId]);
    // Clean up quizzes linked to the course
    const [quizzes] = await conn.query('SELECT id FROM quizzes WHERE course_id = ?', [courseId]);
    for (const q of quizzes) {
      await conn.query('DELETE FROM quiz_questions WHERE quiz_id = ?', [q.id]);
      await conn.query('DELETE FROM quiz_attempts WHERE quiz_id = ?', [q.id]);
      await conn.query('DELETE FROM quiz_results WHERE quiz_id = ?', [q.id]);
      await conn.query('DELETE FROM quizzes WHERE id = ?', [q.id]);
    }
  } finally {
    conn.release();
  }
}

describe('Certificate Auto-Issuance on Course Completion', () => {
  let courseId;
  let templateId;
  let enrollmentId;

  afterEach(async () => {
    if (courseId && templateId && enrollmentId) {
      await cleanup(courseId, templateId, enrollmentId);
    }
  });

  test('issues a certificate when all conditions are met', async () => {
    const userId = 4; // Sarah M.
    const actorId = 1; // Super Admin

    const template = await createTestTemplate();
    templateId = template.id;

    courseId = await createTestCourse(userId);

    await certificateCourseLinkService.linkCertificateToCourse(courseId, templateId, { is_default: true, display_order: 0 }, { role: 'super_admin', id: actorId, department_id: 1 });

    const quizId = await createTestQuiz(courseId);
    await createPassedAttempt(quizId, userId);

    enrollmentId = await createTestEnrollment(courseId, userId);

    const result = await certificateAutoIssuanceService.autoIssueOnCompletion(courseId, userId, enrollmentId, actorId);

    expect(result.issued).toBe(true);
    expect(result.issuance).toBeDefined();
    expect(result.issuance.template_id).toBe(templateId);
    expect(result.issuance.user_id).toBe(userId);
    expect(result.issuance.course_id).toBe(courseId);
    expect(result.issuance.enrollment_id).toBe(enrollmentId);
    expect(result.issuance.status).toBe('active');
    expect(result.issuance.certificate_number).toBeDefined();
    expect(result.issuance.resolved_sections).toBeDefined();
    expect(result.issuance.resolved_sections.recipient_name).toBeDefined();

    const dbIssuance = await certificateIssuanceModel.findByEnrollment(enrollmentId);
    expect(dbIssuance).not.toBeNull();
    expect(dbIssuance.status).toBe('active');
  });

  test('does not issue when course.send_completion_certificates is false', async () => {
    const userId = 4;
    const actorId = 1;

    const template = await createTestTemplate();
    templateId = template.id;

    courseId = await createTestCourse(userId, { send_completion_certificates: false });

    await certificateCourseLinkService.linkCertificateToCourse(courseId, templateId, { is_default: true, display_order: 0 }, { role: 'super_admin', id: actorId, department_id: 1 });

    const quizId = await createTestQuiz(courseId);
    await createPassedAttempt(quizId, userId);

    enrollmentId = await createTestEnrollment(courseId, userId);

    const result = await certificateAutoIssuanceService.shouldAutoIssue(courseId, userId, enrollmentId);

    expect(result.shouldIssue).toBe(false);
    expect(result.reason).toMatch(/does not have completion certificates enabled/i);
  });

  test('does not issue when no certificate template is linked', async () => {
    const userId = 4;
    const actorId = 1;

    courseId = await createTestCourse(userId);

    const quizId = await createTestQuiz(courseId);
    await createPassedAttempt(quizId, userId);

    enrollmentId = await createTestEnrollment(courseId, userId);

    const result = await certificateAutoIssuanceService.autoIssueOnCompletion(courseId, userId, enrollmentId, actorId);

    expect(result.issued).toBe(false);
    expect(result.reason).toMatch(/No certificate template linked/i);
  });

  test('does not issue when certificate already issued for enrollment', async () => {
    const userId = 4;
    const actorId = 1;

    const template = await createTestTemplate();
    templateId = template.id;

    courseId = await createTestCourse(userId);

    await certificateCourseLinkService.linkCertificateToCourse(courseId, templateId, { is_default: true, display_order: 0 }, { role: 'super_admin', id: actorId, department_id: 1 });

    const quizId = await createTestQuiz(courseId);
    await createPassedAttempt(quizId, userId);

    enrollmentId = await createTestEnrollment(courseId, userId);

    await certificateAutoIssuanceService.autoIssueOnCompletion(courseId, userId, enrollmentId, actorId);

    const result = await certificateAutoIssuanceService.autoIssueOnCompletion(courseId, userId, enrollmentId, actorId);

    expect(result.issued).toBe(false);
    expect(result.reason).toMatch(/already issued/i);
  });

  test('does not issue when quiz is not passed', async () => {
    const userId = 4;
    const actorId = 1;

    const template = await createTestTemplate();
    templateId = template.id;

    courseId = await createTestCourse(userId);

    await certificateCourseLinkService.linkCertificateToCourse(courseId, templateId, { is_default: true, display_order: 0 }, { role: 'super_admin', id: actorId, department_id: 1 });

    const quizId = await createTestQuiz(courseId);
    const attemptId = await quizModel.createAttempt({
      quiz_id: quizId,
      user_id: userId,
      attempt_number: 1,
      answers: {},
      time_limit_sec: 600,
    });
    await quizModel.updateAttempt(attemptId, {
      status: 'completed',
      score: 50,
      max_score: 100,
      percentage: 50.0,
      passed: false,
      submitted_at: new Date(),
      time_taken_sec: 540,
    });

    enrollmentId = await createTestEnrollment(courseId, userId);

    const result = await certificateAutoIssuanceService.shouldAutoIssue(courseId, userId, enrollmentId);

    expect(result.shouldIssue).toBe(false);
    expect(result.reason).toMatch(/not passed/i);
  });

  test('does not issue when course has unpublished quizzes', async () => {
    const userId = 4;
    const actorId = 1;

    const template = await createTestTemplate();
    templateId = template.id;

    courseId = await createTestCourse(userId);

    await certificateCourseLinkService.linkCertificateToCourse(courseId, templateId, { is_default: true, display_order: 0 }, { role: 'super_admin', id: actorId, department_id: 1 });

    // Create one published quiz so the "has quizzes" branch is entered,
    // plus one draft quiz so the unpublished-quiz guard triggers.
    await createTestQuiz(courseId, { status: 'published', title: 'Published Quiz' });
    await createTestQuiz(courseId, { status: 'draft', title: 'Draft Quiz' });

    enrollmentId = await createTestEnrollment(courseId, userId);

    const result = await certificateAutoIssuanceService.shouldAutoIssue(courseId, userId, enrollmentId);

    expect(result.shouldIssue).toBe(false);
    expect(result.reason).toMatch(/unpublished quizzes/i);
  });

  test('overrides recipient_name and date correctly', async () => {
    const userId = 4;
    const actorId = 1;
    const customName = 'Custom Recipient Name';
    const customDate = '2024-12-25';

    const template = await createTestTemplate();
    templateId = template.id;

    courseId = await createTestCourse(userId);

    await certificateCourseLinkService.linkCertificateToCourse(courseId, templateId, { is_default: true, display_order: 0 }, { role: 'super_admin', id: actorId, department_id: 1 });

    const quizId = await createTestQuiz(courseId);
    await createPassedAttempt(quizId, userId);

    enrollmentId = await createTestEnrollment(courseId, userId);

    const result = await certificateAutoIssuanceService.autoIssueOnCompletion(courseId, userId, enrollmentId, actorId, {
      recipient_name: customName,
      date: customDate,
    });

    expect(result.issued).toBe(true);
    expect(result.issuance.resolved_sections.recipient_name.text).toBe(customName);
    expect(result.issuance.resolved_sections.date.text).toBe(customDate);
  });

  test('auto-fills recipient_name from user full_name when no override is provided', async () => {
    const userId = 4; // Sarah M.
    const actorId = 1;

    const template = await createTestTemplate();
    templateId = template.id;

    courseId = await createTestCourse(userId);

    await certificateCourseLinkService.linkCertificateToCourse(courseId, templateId, { is_default: true, display_order: 0 }, { role: 'super_admin', id: actorId, department_id: 1 });

    const quizId = await createTestQuiz(courseId);
    await createPassedAttempt(quizId, userId);

    enrollmentId = await createTestEnrollment(courseId, userId);

    const result = await certificateAutoIssuanceService.autoIssueOnCompletion(courseId, userId, enrollmentId, actorId);

    expect(result.issued).toBe(true);
    expect(result.issuance.resolved_sections.recipient_name.text).toBe('Sarah M.');
    expect(result.issuance.resolved_sections.date.text).toBe(new Date().toISOString().split('T')[0]);
  });
});

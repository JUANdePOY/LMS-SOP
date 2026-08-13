const db = require('../config/database');
const courseModel = require('../models/courseModel');
const certificateTemplateModel = require('../models/certificateTemplateModel');
const certificateCourseLinkModel = require('../models/certificateCourseLinkModel');
const certificateCourseLinkService = require('../services/certificateCourseLinkService');

const MINIMAL_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
]);

const FRAME_DIR = require('path').join(__dirname, '..', 'server', 'uploads', 'certificates', 'templates');
const FRAME_PATH = require('path').join(FRAME_DIR, 'frame.png');

function ensureFrameFile() {
  if (!require('fs').existsSync(FRAME_DIR)) {
    require('fs').mkdirSync(FRAME_DIR, { recursive: true });
  }
  if (!require('fs').existsSync(FRAME_PATH)) {
    require('fs').writeFileSync(FRAME_PATH, MINIMAL_PNG);
  }
}

beforeAll(() => {
  ensureFrameFile();
});

afterAll(() => {
  try { require('fs').unlinkSync(FRAME_PATH); } catch {}
});

async function createTestTemplate(name = 'Link Test Template', opts = {}) {
  const publicId = `test-link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const id = await certificateTemplateModel.create({
    public_id: publicId,
    name: name,
    department_id: opts.department_id ?? null,
    frame_filename: 'frame.png',
    frame_storage_path: 'certificates/templates/frame.png',
    orientation: 'landscape',
    width_px: 1123,
    height_px: 794,
    sections: opts.sections || {
      title: { text: 'Test Certificate', x_percent: 50, y_percent: 14, font_size: 44, font_weight: 'bold', font_family: 'Georgia, serif', line_height: 1.1, width_percent: 85, text_align: 'center' },
      recipient_name: { text: '', x_percent: 50, y_percent: 47, font_size: 40, font_family: 'Brush Script MT, cursive', line_height: 1.15, width_percent: 80, text_align: 'center' },
    },
    status: opts.status || 'active',
    created_by: opts.created_by || 1,
    is_deleted: opts.is_deleted || 0,
  });
  return { id, publicId };
}

async function createTestCourse(userId = 4, opts = {}) {
  const courseId = await courseModel.create({
    title: opts.title || `Link Test Course ${Date.now()}`,
    description: opts.description || 'Test course for certificate linking',
    difficulty: 'beginner',
    status: opts.status || 'published',
    instructor_id: userId,
    allow_self_enrollment: true,
    send_completion_certificates: opts.send_completion_certificates ?? true,
    department_id: opts.department_id || 1,
  });
  return courseId;
}

async function cleanup(courseId, templateId) {
  const conn = await db.getConnection();
  try {
    await conn.query('DELETE FROM certificate_course_links WHERE course_id = ? AND certificate_template_id = ?', [courseId, templateId]);
    await conn.query('DELETE FROM certificate_templates WHERE id = ?', [templateId]);
    await conn.query('DELETE FROM courses WHERE id = ?', [courseId]);
  } finally {
    conn.release();
  }
}

describe('Certificate Course Link', () => {
  let courseId;
  let templateId;

  afterEach(async () => {
    if (courseId && templateId) {
      await cleanup(courseId, templateId);
    }
  });

  test('links a certificate template to a course', async () => {
    const actorId = 1;
    const template = await createTestTemplate();
    templateId = template.id;
    courseId = await createTestCourse();

    const result = await certificateCourseLinkService.linkCertificateToCourse(
      courseId,
      template.id,
      { is_default: true, display_order: 0 },
      { role: 'super_admin', id: actorId, department_id: 1 }
    );

    expect(result.id).toBeDefined();
    expect(result.id).toBeGreaterThan(0);

    const link = await certificateCourseLinkModel.findByCourseAndTemplate(courseId, template.id);
    expect(link).not.toBeNull();
    expect(link.is_default).toBe(1);
    expect(link.display_order).toBe(0);
  });

  test('prevents duplicate linking', async () => {
    const actorId = 1;
    const template = await createTestTemplate();
    templateId = template.id;
    courseId = await createTestCourse();

    await certificateCourseLinkService.linkCertificateToCourse(
      courseId,
      template.id,
      { is_default: true, display_order: 0 },
      { role: 'super_admin', id: actorId, department_id: 1 }
    );

    await expect(
      certificateCourseLinkService.linkCertificateToCourse(
        courseId,
        template.id,
        { is_default: true, display_order: 0 },
        { role: 'super_admin', id: actorId, department_id: 1 }
      )
    ).rejects.toThrow('already linked');
  });

  test('fails when course does not exist', async () => {
    const template = await createTestTemplate();
    templateId = template.id;

    await expect(
      certificateCourseLinkService.linkCertificateToCourse(
        999999,
        template.id,
        {},
        { role: 'super_admin', id: 1, department_id: 1 }
      )
    ).rejects.toThrow('Course not found');
  });

  test('fails when template does not exist', async () => {
    courseId = await createTestCourse();

    await expect(
      certificateCourseLinkService.linkCertificateToCourse(
        courseId,
        999999,
        {},
        { role: 'super_admin', id: 1, department_id: 1 }
      )
    ).rejects.toThrow('Certificate template not found');
  });

  test('fails when template is deleted', async () => {
    const template = await createTestTemplate();
    templateId = template.id;
    courseId = await createTestCourse();

    // Soft-delete the template after creation
    await certificateTemplateModel.softDelete(template.id);

    await expect(
      certificateCourseLinkService.linkCertificateToCourse(
        courseId,
        template.id,
        {},
        { role: 'super_admin', id: 1, department_id: 1 }
      )
    ).rejects.toThrow('Certificate template not found');
  });

  test('department_head cannot link templates from another department', async () => {
    const template = await createTestTemplate(undefined, { department_id: null });
    templateId = template.id;
    courseId = await createTestCourse(undefined, { department_id: 1 });

    await expect(
      certificateCourseLinkService.linkCertificateToCourse(
        courseId,
        template.id,
        {},
        { role: 'department_head', id: 1, department_id: 2 }
      )
    ).rejects.toThrow('Forbidden');
  });

  test('department_head can link templates within their department', async () => {
    const template = await createTestTemplate(undefined, { department_id: null });
    templateId = template.id;
    // Both course and requester have no department restriction
    courseId = await createTestCourse(undefined, { department_id: null });

    const result = await certificateCourseLinkService.linkCertificateToCourse(
      courseId,
      template.id,
      { is_default: true, display_order: 0 },
      { role: 'department_head', id: 1, department_id: null }
    );

    expect(result.id).toBeDefined();
  });

  test('unlinks a certificate template from a course', async () => {
    const actorId = 1;
    const template = await createTestTemplate();
    templateId = template.id;
    courseId = await createTestCourse();

    await certificateCourseLinkService.linkCertificateToCourse(
      courseId,
      template.id,
      { is_default: true, display_order: 0 },
      { role: 'super_admin', id: actorId, department_id: 1 }
    );

    const unlinkResult = await certificateCourseLinkService.unlinkCertificateFromCourse(
      courseId,
      template.id,
      { role: 'super_admin', id: actorId, department_id: 1 }
    );

    expect(unlinkResult.affected).toBe(1);

    const link = await certificateCourseLinkModel.findByCourseAndTemplate(courseId, template.id);
    expect(link).toBeNull();
  });

  test('fails to unlink when not linked', async () => {
    const template = await createTestTemplate();
    templateId = template.id;
    courseId = await createTestCourse();

    await expect(
      certificateCourseLinkService.unlinkCertificateFromCourse(
        courseId,
        template.id,
        { role: 'super_admin', id: 1, department_id: 1 }
      )
    ).rejects.toThrow('not linked');
  });

  test('lists certificates linked to a course', async () => {
    const actorId = 1;
    const template = await createTestTemplate();
    templateId = template.id;
    courseId = await createTestCourse();

    await certificateCourseLinkService.linkCertificateToCourse(
      courseId,
      template.id,
      { is_default: true, display_order: 0 },
      { role: 'super_admin', id: actorId, department_id: 1 }
    );

    const links = await certificateCourseLinkService.listCourseCertificates(courseId, { role: 'super_admin', id: actorId, department_id: 1 });
    expect(links.length).toBe(1);
    expect(links[0].template_name).toBe('Link Test Template');
    expect(links[0].is_default).toBe(1);
  });

  test('getDefaultTemplateForCourse returns template when default exists', async () => {
    const actorId = 1;
    const template = await createTestTemplate();
    templateId = template.id;
    courseId = await createTestCourse();

    await certificateCourseLinkService.linkCertificateToCourse(
      courseId,
      template.id,
      { is_default: true, display_order: 0 },
      { role: 'super_admin', id: actorId, department_id: 1 }
    );

    const defaultTemplate = await certificateCourseLinkService.getDefaultTemplateForCourse(courseId);
    expect(defaultTemplate).not.toBeNull();
    expect(defaultTemplate.id).toBe(template.id);
    expect(defaultTemplate.status).toBe('active');
  });

  test('getDefaultTemplateForCourse returns null when no default', async () => {
    courseId = await createTestCourse();
    const defaultTemplate = await certificateCourseLinkService.getDefaultTemplateForCourse(courseId);
    expect(defaultTemplate).toBeNull();
  });

  test('getDefaultTemplateForCourse returns null when template is deleted', async () => {
    const actorId = 1;
    const template = await createTestTemplate();
    templateId = template.id;
    courseId = await createTestCourse();

    await certificateCourseLinkService.linkCertificateToCourse(
      courseId,
      template.id,
      { is_default: true, display_order: 0 },
      { role: 'super_admin', id: actorId, department_id: 1 }
    );

    // Soft-delete the template
    await certificateTemplateModel.softDelete(template.id);

    const defaultTemplate = await certificateCourseLinkService.getDefaultTemplateForCourse(courseId);
    expect(defaultTemplate).toBeNull();
  });

  test('getDefaultTemplateForCourse returns null when template is draft', async () => {
    const actorId = 1;
    const template = await createTestTemplate(undefined, { status: 'draft' });
    templateId = template.id;
    courseId = await createTestCourse();

    await certificateCourseLinkService.linkCertificateToCourse(
      courseId,
      template.id,
      { is_default: true, display_order: 0 },
      { role: 'super_admin', id: actorId, department_id: 1 }
    );

    const defaultTemplate = await certificateCourseLinkService.getDefaultTemplateForCourse(courseId);
    expect(defaultTemplate).toBeNull();
  });
});

const db = require('../config/database');
const courseModel = require('../models/courseModel');
const courseModuleModel = require('../models/courseModuleModel');
const courseContentModel = require('../models/courseContentModel');
const { authenticateToken, authorize } = require('../middleware/auth');
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
  if (code === 500) console.error('[Course Builder Error]', err);
  return res.status(code).json(body);
}

function isAuthoringRole(user) {
  return ['super_admin', 'admin', 'department_head'].includes(user?.role);
}

async function uploadThumbnail(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No thumbnail file uploaded', code: 'NO_FILE' });
    }

    const path = require('path');
    const fs = require('fs/promises');
    const { getUploadRoot, courseThumbnailDir, safeExtFromOriginal } = require('../config/uploads');

    const ext = safeExtFromOriginal(req.file.originalname) || '.jpg';
    const dir = courseThumbnailDir();
    await fs.mkdir(dir, { recursive: true });

    const filename = `thumb-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    const absPath = path.join(dir, filename);
    await fs.writeFile(absPath, req.file.buffer);

    const relPath = path.relative(getUploadRoot(), absPath).replace(/\\/g, '/');
    const thumbnailUrl = `/uploads/${relPath}`;

    logAudit('course.thumbnail.uploaded', req.user.id, { thumbnail_url: thumbnailUrl });

    res.status(201).json({ success: true, data: { thumbnail_url: thumbnailUrl }, message: 'Thumbnail uploaded successfully' });
  } catch (error) {
    console.error('[Course Thumbnail Upload Error]', error);
    res.status(500).json({ success: false, message: 'Failed to upload thumbnail', code: 'UPLOAD_ERROR' });
  }
}

function getVisibleCoursesWhere(user) {
  if (user.role === 'department_head') {
    return {
      where: 'c.department_id = ? OR c.department_id IS NULL',
      params: [user.department_id],
    };
  }
  return { where: '1 = 1', params: [] };
}

async function listCourses(req, res) {
  const userId = req.user?.id;
  if (!isAuthoringRole(req.user)) {
    return res.status(403).json({ success: false, message: 'Forbidden', code: 'FORBIDDEN' });
  }

  const { page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  const { where, params } = getVisibleCoursesWhere(req.user);

  try {
    const [rows] = await db.query(
      `SELECT c.*, u.full_name AS instructor_name, d.name AS department_name
       FROM courses c
       LEFT JOIN users u ON c.instructor_id = u.id
       LEFT JOIN departments d ON c.department_id = d.id
       WHERE ${where} AND c.is_deleted = FALSE
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    const [[totalRow]] = await db.query(
      `SELECT COUNT(*) AS total FROM courses c WHERE ${where} AND c.is_deleted = FALSE`,
      params
    );

    res.json({
      success: true,
      message: 'OK',
      data: rows,
      pagination: { page: pageNum, limit: limitNum, total: totalRow?.total ?? 0, totalPages: Math.ceil((totalRow?.total ?? 0) / limitNum) || 1 },
    });
  } catch (err) {
    sendError(res, err, 'Failed to list courses');
  }
}

async function getCourse(req, res) {
  const userId = req.user?.id;
  if (!isAuthoringRole(req.user)) {
    return res.status(403).json({ success: false, message: 'Forbidden', code: 'FORBIDDEN' });
  }

  const courseId = parseInt(req.params.id, 10);

  try {
    const [courseRows] = await db.query(
      `SELECT c.*, u.full_name AS instructor_name, d.name AS department_name
       FROM courses c
       LEFT JOIN users u ON c.instructor_id = u.id
       LEFT JOIN departments d ON c.department_id = d.id
       WHERE c.id = ? AND c.is_deleted = FALSE LIMIT 1`,
      [courseId]
    );

    const course = courseRows[0] || null;
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    if (req.user.role === 'department_head') {
      const deptId = req.user.department_id;
      if (course.department_id !== deptId) {
        return res.json({ success: true, message: 'OK', data: course, readOnly: true, modules: [], lessons: [] });
      }
    }

    const [modules] = await db.query(
      'SELECT * FROM course_modules WHERE course_id = ? AND is_deleted = FALSE ORDER BY order_index ASC, id ASC',
      [courseId]
    );

    const moduleIds = modules.map(m => m.id);
    const queryResult = moduleIds.length
      ? await db.query(
          `SELECT * FROM module_content WHERE module_id IN (?) AND is_deleted = FALSE ORDER BY order_index ASC, id ASC`,
          [moduleIds]
        )
      : [[]];
    const lessonsRows = Array.isArray(queryResult) && queryResult[0] && Array.isArray(queryResult[0]) ? queryResult[0] : [];

    const lessonsByModule = new Map();
    for (const l of lessonsRows) {
      if (!lessonsByModule.has(l.module_id)) lessonsByModule.set(l.module_id, []);
      lessonsByModule.get(l.module_id).push(l);
    }

    const enrichedModules = modules.map(m => ({
      ...m,
      lessons: lessonsByModule.get(m.id) || [],
    }));

    res.json({ success: true, message: 'OK', data: course, readOnly: false, modules: enrichedModules });
  } catch (err) {
    sendError(res, err, 'Failed to load course');
  }
}

async function createCourse(req, res) {
  const userId = req.user?.id;
  if (!isAuthoringRole(req.user)) {
    return res.status(403).json({ success: false, message: 'Forbidden', code: 'FORBIDDEN' });
  }
  if (!req.user?.id) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const body = req.body || {};
  const { title, description, category, category_id, difficulty, thumbnail_url, prerequisites, learning_outcomes, max_enrollments, start_date, end_date, grading_scale, allow_self_enrollment, send_completion_certificates, status, department_id, modules } = body;

  if (!title || !String(title).trim()) {
    return res.status(400).json({ success: false, message: 'Course title is required', code: 'VALIDATION_ERROR' });
  }

  const role = req.user.role;
  let effectiveDepartmentId = null;
  if (role === 'department_head') {
    effectiveDepartmentId = req.user.department_id || null;
  } else if (role === 'super_admin' || role === 'admin') {
    effectiveDepartmentId = department_id ?? null;
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [courseResult] = await conn.query(
      `INSERT INTO courses (
        title, description, category, category_id, difficulty, status, instructor_id, thumbnail_url,
        prerequisites, learning_outcomes, max_enrollments, start_date, end_date,
        grading_scale, allow_self_enrollment, send_completion_certificates, department_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(title).trim(),
        description ?? null,
        category ?? null,
        category_id ? parseInt(category_id, 10) : null,
        difficulty || 'beginner',
        status || 'draft',
        userId,
        thumbnail_url ?? null,
        prerequisites && typeof prerequisites === 'object' ? JSON.stringify(prerequisites) : (Array.isArray(prerequisites) ? JSON.stringify(prerequisites) : (prerequisites || null)),
        learning_outcomes && typeof learning_outcomes === 'object' ? JSON.stringify(learning_outcomes) : (Array.isArray(learning_outcomes) ? JSON.stringify(learning_outcomes) : (learning_outcomes || null)),
        max_enrollments ? parseInt(max_enrollments, 10) : null,
        start_date ?? null,
        end_date ?? null,
        grading_scale || 'STANDARD',
        allow_self_enrollment ?? true,
        send_completion_certificates ?? false,
        effectiveDepartmentId,
      ]
    );

    const courseId = courseResult.insertId;

    const moduleOrder = Array.isArray(modules) ? modules : [];
    for (let mIdx = 0; mIdx < moduleOrder.length; mIdx++) {
      const mod = moduleOrder[mIdx];
      if (!mod || !String(mod.title || '').trim()) continue;

      const [modResult] = await conn.query(
        `INSERT INTO course_modules (course_id, title, description, type, order_index, is_visible)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [courseId, String(mod.title).trim(), mod.description ?? null, mod.type || 'chapter', mIdx + 1, mod.is_visible ?? true]
      );

      const moduleId = modResult.insertId;
      const lessonOrder = Array.isArray(mod.lessons) ? mod.lessons : [];
      for (let lIdx = 0; lIdx < lessonOrder.length; lIdx++) {
        const lesson = lessonOrder[lIdx];
        if (!lesson || !String(lesson.title || '').trim()) continue;

        const lessonType = ['video', 'reading', 'document', 'quiz', 'assignment', 'link', 'presentation', 'downloadable', 'live_session', 'interactive', 'sop'].includes(lesson.type) ? lesson.type : 'reading';
        await conn.query(
          `INSERT INTO module_content (module_id, title, type, description, order_index, url, duration, is_required, requires_quiz_pass, passing_score, quiz_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            moduleId,
            String(lesson.title).trim(),
            lessonType,
            lesson.description ?? lesson.content ?? null,
            lIdx + 1,
            lesson.url ?? lesson.content ?? null,
            lesson.duration ? parseInt(lesson.duration, 10) : null,
            lesson.is_required ?? true,
            lesson.requiresQuizPass ? 1 : 0,
            lesson.passingScore ? parseInt(lesson.passingScore, 10) : null,
            lesson.quizId ? parseInt(lesson.quizId, 10) : null,
          ]
        );
      }
    }

    await conn.commit();

    logAudit('course.builder.create', userId, { courseId, title, status: status || 'draft' });

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: { id: courseId, title: String(title).trim(), status: status || 'draft' },
    });
  } catch (err) {
    await conn.rollback();
    sendError(res, err, 'Failed to create course');
  } finally {
    conn.release();
  }
}

async function updateCourse(req, res) {
  const userId = req.user?.id;
  if (!isAuthoringRole(req.user)) {
    return res.status(403).json({ success: false, message: 'Forbidden', code: 'FORBIDDEN' });
  }

  const courseId = parseInt(req.params.id, 10);
  const body = req.body || {};
  const { title, description, category, category_id, difficulty, thumbnail_url, prerequisites, learning_outcomes, max_enrollments, start_date, end_date, grading_scale, allow_self_enrollment, send_completion_certificates, status, department_id, modules } = body;

  try {
    const [courseRows] = await db.query('SELECT * FROM courses WHERE id = ? AND is_deleted = FALSE LIMIT 1', [courseId]);
    const course = courseRows[0] || null;
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    if (req.user.role === 'department_head') {
      const deptId = req.user.department_id;
      if (course.department_id !== deptId) {
        return res.status(403).json({ success: false, message: 'Forbidden - course does not belong to your department', code: 'FORBIDDEN' });
      }
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const allowed = [
        'title', 'description', 'category', 'category_id', 'difficulty', 'thumbnail_url',
        'prerequisites', 'learning_outcomes', 'max_enrollments', 'start_date',
        'end_date', 'grading_scale', 'allow_self_enrollment', 'send_completion_certificates', 'status'
      ];
      const updates = {};
      for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(body, key)) {
          updates[key] = key === 'category_id' ? (body[key] ? parseInt(body[key], 10) : null) : body[key];
        }
      }

      if (req.user.role === 'department_head') {
        updates.department_id = course.department_id;
      } else {
        if (Object.prototype.hasOwnProperty.call(body, 'department_id')) {
          updates.department_id = body.department_id;
        }
      }

      if (Object.prototype.hasOwnProperty.call(updates, 'prerequisites') && updates.prerequisites && typeof updates.prerequisites === 'object') {
        updates.prerequisites = JSON.stringify(updates.prerequisites);
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'learning_outcomes') && updates.learning_outcomes && typeof updates.learning_outcomes === 'object') {
        updates.learning_outcomes = JSON.stringify(updates.learning_outcomes);
      }

      if (Object.keys(updates).length > 0) {
        const sets = [];
        const params = [];
        for (const [key, value] of Object.entries(updates)) {
          sets.push(`${key} = ?`);
          params.push(value);
        }
        params.push(courseId);
        await conn.query(`UPDATE courses SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = FALSE`, params);
      }

      if (Array.isArray(modules)) {
        const [existingMods] = await conn.query('SELECT id FROM course_modules WHERE course_id = ? AND is_deleted = FALSE', [courseId]);
        const existingIds = new Set(existingMods.map(m => m.id));
        const incomingIds = new Set();

        for (let mIdx = 0; mIdx < modules.length; mIdx++) {
          const mod = modules[mIdx];
          if (!mod) continue;
          const modTitle = String(mod.title || '').trim();
          const hasLessons = Array.isArray(mod.lessons) && mod.lessons.length > 0;
          const hasTempId = String(mod.id || '').startsWith('new-');
          if (!modTitle && !hasLessons && !hasTempId) continue;
          const effectiveTitle = modTitle || (hasTempId ? `Module ${mIdx + 1}` : mod.title || `Module ${mIdx + 1}`);

          let moduleId = null;
          if (mod.id) {
            const [modRows] = await conn.query('SELECT id FROM course_modules WHERE id = ? AND course_id = ? AND is_deleted = FALSE LIMIT 1', [mod.id, courseId]);
            if (modRows.length) moduleId = modRows[0].id;
          }

          if (moduleId) {
            incomingIds.add(moduleId);
            await conn.query(
              `UPDATE course_modules SET title = ?, description = ?, type = ?, order_index = ?, is_visible = ? WHERE id = ?`,
              [effectiveTitle, mod.description ?? null, mod.type || 'chapter', mIdx + 1, mod.is_visible ?? true, moduleId]
            );

            const [existingLessons] = await conn.query('SELECT id FROM module_content WHERE module_id = ? AND is_deleted = FALSE', [moduleId]);
            const existingLessonIds = new Set(existingLessons.map(l => l.id));
            const incomingLessonIds = new Set();

            const lessonOrder = Array.isArray(mod.lessons) ? mod.lessons : [];
            for (let lIdx = 0; lIdx < lessonOrder.length; lIdx++) {
              const lesson = lessonOrder[lIdx];
              if (!lesson) continue;
              const lessonTitle = String(lesson.title || '').trim();
              const effectiveLessonTitle = lessonTitle || `Lesson ${lIdx + 1}`;
              const lessonType = ['video', 'reading', 'document', 'quiz', 'assignment', 'link', 'presentation', 'downloadable', 'live_session', 'interactive', 'sop'].includes(lesson.type) ? lesson.type : 'reading';

              let lessonId = null;
              if (lesson.id) {
                const [lRows] = await conn.query('SELECT id FROM module_content WHERE id = ? AND module_id = ? AND is_deleted = FALSE LIMIT 1', [lesson.id, moduleId]);
                if (lRows.length) lessonId = lRows[0].id;
              }

              if (lessonId) {
                incomingLessonIds.add(lessonId);
                await conn.query(
                  `UPDATE module_content SET title = ?, type = ?, description = ?, order_index = ?, url = ?, duration = ?, is_required = ?, requires_quiz_pass = ?, passing_score = ?, quiz_id = ? WHERE id = ?`,
                  [
                    effectiveLessonTitle,
                    lessonType,
                    lesson.description ?? lesson.content ?? null,
                    lIdx + 1,
                    lesson.url ?? lesson.content ?? null,
                    lesson.duration ? parseInt(lesson.duration, 10) : null,
                    lesson.is_required ?? true,
                    lesson.requiresQuizPass ? 1 : 0,
                    lesson.passingScore ? parseInt(lesson.passingScore, 10) : null,
                    lesson.quizId ? parseInt(lesson.quizId, 10) : null,
                    lessonId,
                  ]
                );
              } else {
                const [newLesson] = await conn.query(
                  `INSERT INTO module_content (module_id, title, type, description, order_index, url, duration, is_required, requires_quiz_pass, passing_score, quiz_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    moduleId,
                    effectiveLessonTitle,
                    lessonType,
                    lesson.description ?? lesson.content ?? null,
                    lIdx + 1,
                    lesson.url ?? lesson.content ?? null,
                    lesson.duration ? parseInt(lesson.duration, 10) : null,
                    lesson.is_required ?? true,
                    lesson.requiresQuizPass ? 1 : 0,
                    lesson.passingScore ? parseInt(lesson.passingScore, 10) : null,
                    lesson.quizId ? parseInt(lesson.quizId, 10) : null,
                  ]
                );
                incomingLessonIds.add(newLesson.insertId);
              }
            }

            const toDelete = [...existingLessonIds].filter(id => !incomingLessonIds.has(id));
            if (toDelete.length) {
              await conn.query(`UPDATE module_content SET is_deleted = TRUE WHERE id IN (?) AND module_id = ?`, [toDelete, moduleId]);
            }
          } else {
            const [newMod] = await conn.query(
              `INSERT INTO course_modules (course_id, title, description, type, order_index, is_visible)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [courseId, effectiveTitle, mod.description ?? null, mod.type || 'chapter', mIdx + 1, mod.is_visible ?? true]
            );
            const moduleId = newMod.insertId;
            incomingIds.add(moduleId);

            const lessonOrder = Array.isArray(mod.lessons) ? mod.lessons : [];
            for (let lIdx = 0; lIdx < lessonOrder.length; lIdx++) {
              const lesson = lessonOrder[lIdx];
              if (!lesson || !String(lesson.title || '').trim()) continue;

              const lessonType = ['video', 'reading', 'document', 'quiz', 'assignment', 'link', 'presentation', 'downloadable', 'live_session', 'interactive', 'sop'].includes(lesson.type) ? lesson.type : 'reading';
              await conn.query(
                `INSERT INTO module_content (module_id, title, type, description, order_index, url, duration, is_required, requires_quiz_pass, passing_score, quiz_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  moduleId,
                  String(lesson.title).trim(),
                  lessonType,
                  lesson.description ?? lesson.content ?? null,
                  lIdx + 1,
                  lesson.url ?? lesson.content ?? null,
                  lesson.duration ? parseInt(lesson.duration, 10) : null,
                  lesson.is_required ?? true,
                  lesson.requiresQuizPass ? 1 : 0,
                  lesson.passingScore ? parseInt(lesson.passingScore, 10) : null,
                  lesson.quizId ? parseInt(lesson.quizId, 10) : null,
                ]
              );
            }
          }
        }

        const toDeleteMods = [...existingIds].filter(id => !incomingIds.has(id));
        if (toDeleteMods.length) {
          if (incomingIds.size === 0 && existingIds.size > 0) {
          } else {
            await conn.query(`UPDATE course_modules SET is_deleted = TRUE WHERE id IN (?) AND course_id = ?`, [toDeleteMods, courseId]);
          }
        }
      }

      await conn.commit();

      logAudit('course.builder.update', userId, { courseId, updates });

      res.json({ success: true, message: 'Course updated successfully', data: { id: courseId } });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    sendError(res, err, 'Failed to update course');
  }
}

async function deleteCourse(req, res) {
  const userId = req.user?.id;
  if (!isAuthoringRole(req.user)) {
    return res.status(403).json({ success: false, message: 'Forbidden', code: 'FORBIDDEN' });
  }

  const courseId = parseInt(req.params.id, 10);

  try {
    const [courseRows] = await db.query('SELECT * FROM courses WHERE id = ? AND is_deleted = FALSE LIMIT 1', [courseId]);
    const course = courseRows[0] || null;
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    if (req.user.role === 'department_head') {
      const deptId = req.user.department_id;
      if (course.department_id !== deptId) {
        return res.status(403).json({ success: false, message: 'Forbidden - course does not belong to your department', code: 'FORBIDDEN' });
      }
    }

    await courseModel.softDelete(courseId);
    logAudit('course.builder.delete', userId, { courseId, title: course.title });
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (err) {
    sendError(res, err, 'Failed to delete course');
  }
}

module.exports = {
  listCourses,
  getCourse,
  uploadThumbnail,
  createCourse,
  updateCourse,
  deleteCourse,
};

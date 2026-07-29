const courseModel = require('../models/courseModel');
const courseModuleModel = require('../models/courseModuleModel');
const courseContentModel = require('../models/courseContentModel');
const enrollmentModel = require('../models/enrollmentModel');
const lessonProgressModel = require('../models/lessonProgressModel');
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
  if (code === 500) console.error('[Progress Controller Error]', err);
  return res.status(code).json(body);
}

function getCourseProgress(req, res) {
  const courseId = parseInt(req.params.courseId, 10);
  const userId = req.user?.id;

  Promise.all([
    courseModel.findById(courseId),
    lessonProgressModel.listByCourse(userId, courseId),
    courseModuleModel.listModules(courseId, { limit: 100 }),
  ])
    .then(([course, progress, modules]) => {
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

      const moduleMap = new Map();
      const contentMap = new Map();

      modules.forEach(mod => {
        moduleMap.set(mod.id, { ...mod, lessons: [] });
      });

      const lessonMap = new Map();
      progress.forEach(p => {
        lessonMap.set(p.lesson_id, p);
      });

      const moduleLessonCounts = new Map();
      progress.forEach(p => {
        const mid = p.module_id;
        if (!moduleLessonCounts.has(mid)) moduleLessonCounts.set(mid, { total: 0, completed: 0 });
        moduleLessonCounts.get(mid).total += 1;
        if (p.status === 'completed') moduleLessonCounts.get(mid).completed += 1;
      });

      const enriched = lessonsInOrder.map((lp, idx) => {
        const mod = moduleMap.get(lp.module_id);
        return {
          id: lp.lesson_id,
          title: lp.lesson_title,
          type: lp.lesson_type,
          order: lp.lesson_order,
          moduleId: lp.module_id,
          moduleOrder: lp.module_order,
          status: lp.status,
          completedAt: lp.completed_at,
          isFirst: idx === 0,
          isLast: idx === lessonsInOrder.length - 1,
        };
      });

      const total = lessonProgressModel.countTotal(courseId);
      const completed = lessonProgressModel.countCompleted(userId, courseId);
      const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

      const moduleSummaries = Array.from(moduleMap.entries()).map(([id, mod]) => {
        const counts = moduleLessonCounts.get(id) || { total: 0, completed: 0 };
        return {
          id: mod.id,
          title: mod.title,
          order_index: mod.order_index,
          totalLessonCount: counts.total,
          completedLessonCount: counts.completed,
        };
      });

      res.json({
        success: true,
        message: 'OK',
        data: {
          courseId,
          title: course.title,
          modules: Array.from(moduleMap.values()),
          lessons: enriched,
          summary: {
            total,
            completed,
            completionPct,
          },
          moduleProgress: moduleSummaries,
        },
      });
    })
    .catch((err) => sendError(res, err, 'Failed to load progress'));
}

async function markLessonComplete(req, res) {
  const userId = req.user?.id;
  const lessonId = parseInt(req.params.lessonId, 10);

  try {
    const lesson = await courseContentModel.findById(lessonId);
    if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found' });

    const module = await courseModuleModel.findById(lesson.module_id);
    if (!module) return res.status(404).json({ success: false, message: 'Module not found' });

    const courseId = module.course_id;
    const existing = await lessonProgressModel.findByUserAndLesson(userId, lessonId);
    if (!existing) {
      return res.status(400).json({ success: false, message: 'You do not have access to this lesson yet', code: 'LESSON_LOCKED' });
    }
    if (existing.status === 'completed') {
      return res.json({ success: true, message: 'Lesson already completed' });
    }

    const conn = await lessonProgressModel.db.getConnection();
    try {
      await conn.beginTransaction();

      await lessonProgressModel.markCompleted(conn, userId, lessonId, courseId);

      if (lesson.requires_quiz_pass) {
        const quiz = await quizModel.listQuizzes(courseId, { module_id: lesson.module_id, limit: 1 });
        const latestQuiz = quiz[0];
        if (!latestQuiz || latestQuiz.passing_score === null) {
          await conn.rollback();
          return res.status(400).json({ success: false, message: 'Quiz not configured for this lesson', code: 'QUIZ_NOT_CONFIGURED' });
        }
        const submissions = await quizModel.getUserSubmissions(userId, latestQuiz.id);
        const latest = submissions[0];
        if (!latest || latest.score === null) {
          await conn.rollback();
          return res.status(400).json({ success: false, message: 'Quiz attempt required', code: 'QUIZ_REQUIRED' });
        }
        if (latest.score < latestQuiz.passing_score) {
          await conn.rollback();
          return res.status(400).json({ success: false, message: `Quiz score ${latest.score} did not pass minimum ${latestQuiz.passing_score}`, code: 'QUIZ_FAILED' });
        }
      }

      const nextLessonId = await lessonProgressModel.getNextLessonId(userId, courseId, lessonId);
      if (nextLessonId) {
        await lessonProgressModel.unlock(conn, userId, nextLessonId, courseId);
      }

      const [[completedCount]] = await conn.query(
        'SELECT COUNT(*) AS c FROM lesson_progress WHERE user_id = ? AND course_id = ? AND status = ?',
        [userId, courseId, 'completed']
      );
      const [[totalCount]] = await conn.query(
        `SELECT COUNT(*) AS t FROM module_content mc
         JOIN course_modules cm ON mc.module_id = cm.id
         WHERE cm.course_id = ? AND mc.is_deleted = FALSE AND cm.is_deleted = FALSE`,
        [courseId]
      );
      const total = totalCount?.t ?? 0;
      const completed = completedCount?.c ?? 0;

      const currentModuleId = await lessonProgressModel.getModuleOfLesson(lessonId);
      if (currentModuleId && await lessonProgressModel.isModuleCompleted(userId, currentModuleId)) {
        const nextModuleId = await lessonProgressModel.getNextModuleId(courseId, currentModuleId);
        if (nextModuleId) {
          const nextModFirstLesson = await lessonProgressModel.getFirstLessonIdOfModule(nextModuleId);
          if (nextModFirstLesson) {
            await lessonProgressModel.unlock(conn, userId, nextModFirstLesson, courseId);
          }
        }
      }

      if (total > 0 && completed >= total) {
        const [[enrollment]] = await conn.query(
          'SELECT id FROM course_enrollments WHERE course_id = ? AND user_id = ? AND status != ? AND is_deleted = FALSE LIMIT 1',
          [courseId, userId, 'completed']
        );
        if (enrollment) {
          await conn.query(
            'UPDATE course_enrollments SET status = ?, completed_at = ?, progress_percentage = ? WHERE id = ?',
            ['completed', new Date(), 100, enrollment.id]
          );
          logAudit('course.complete', userId, { courseId, enrollmentId: enrollment.id });
        }
      } else {
        const [[enrollment]] = await conn.query(
          'SELECT id FROM course_enrollments WHERE course_id = ? AND user_id = ? AND is_deleted = FALSE LIMIT 1'
        );
        if (enrollment) {
          const pct = Math.round((completed / total) * 100);
          await conn.query(
            'UPDATE course_enrollments SET progress_percentage = ? WHERE id = ?',
            [pct, enrollment.id]
          );
        }
      }

      logAudit('lesson.complete', userId, { lessonId, courseId });

      await conn.commit();

      const progress = await lessonProgressModel.listByCourse(userId, courseId);
      const totalLessons = await lessonProgressModel.countTotal(courseId);
      const completedLessons = await lessonProgressModel.countCompleted(userId, courseId);
      const completedPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      return res.json({
        success: true,
        message: 'Lesson completed successfully',
        data: {
          lessonId,
          progress: progress.map(p => ({
            lessonId: p.lesson_id,
            status: p.status,
            completedAt: p.completed_at,
          })),
          summary: {
            total: totalLessons,
            completed: completedLessons,
            completionPct: completedPct,
          },
        },
      });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    sendError(res, err, 'Failed to mark lesson complete');
  }
}

async function enrollStudent(req, res) {
  const userId = req.user?.id;
  const { course_id, user_id, role, status } = req.body;

  if (!course_id || !user_id) {
    return res.status(400).json({ success: false, message: 'course_id and user_id are required', code: 'VALIDATION_ERROR' });
  }

  try {
    const course = await courseModel.findById(course_id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const existing = await enrollmentModel.findByCourseAndUser(course_id, user_id);
    if (existing) {
      return res.status(409).json({ success: false, message: 'User is already enrolled in this course', code: 'ALREADY_ENROLLED' });
    }

    const conn = await lessonProgressModel.db.getConnection();
    try {
      await conn.beginTransaction();

      const enrollmentId = await enrollmentModel.create({
        course_id,
        user_id,
        role: role || 'learner',
        status: status || 'active',
      });

      const allLessons = [];
      const [modules] = await conn.query(
        `SELECT cm.id FROM course_modules cm WHERE cm.course_id = ? AND cm.is_deleted = FALSE ORDER BY cm.order_index ASC`,
        [course_id]
      );
      for (const mod of modules) {
        const [contents] = await conn.query(
          `SELECT mc.id FROM module_content mc WHERE mc.module_id = ? AND mc.is_deleted = FALSE ORDER BY mc.order_index ASC`,
          [mod.id]
        );
        contents.forEach(c => allLessons.push(c.id));
      }

      if (allLessons.length) {
        for (let i = 0; i < allLessons.length; i++) {
          const s = i === 0 ? 'unlocked' : 'locked';
          await conn.query(
            'INSERT INTO lesson_progress (user_id, lesson_id, course_id, status) VALUES (?, ?, ?, ?)',
            [user_id, allLessons[i], course_id, s]
          );
        }
      }

      await conn.commit();
      logAudit('enrollment.create', userId, { enrollmentId, course_id, user_id });
      return res.status(201).json({ success: true, message: 'Student enrolled successfully', data: { enrollmentId } });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    sendError(res, err, 'Failed to enroll student');
  }
}

async function getEnrollmentStatus(req, res) {
  const userId = req.user?.id;
  const courseId = parseInt(req.params.courseId, 10);

  try {
    const course = await courseModel.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const enrollment = await enrollmentModel.findByCourseAndUser(courseId, userId);
    if (!enrollment) {
      return res.json({
        success: true,
        data: {
          isEnrolled: false,
          status: null,
          progressPct: 0,
          enrolledAt: null,
          completedAt: null,
        },
      });
    }

    const [[total]] = await lessonProgressModel.db.query(
      `SELECT COUNT(*) AS t FROM module_content mc
       JOIN course_modules cm ON mc.module_id = cm.id
       WHERE cm.course_id = ? AND mc.is_deleted = FALSE AND cm.is_deleted = FALSE`,
      [courseId]
    );
    const totalLessons = total?.t ?? 0;

    const [[completed]] = await lessonProgressModel.db.query(
      'SELECT COUNT(*) AS c FROM lesson_progress WHERE user_id = ? AND course_id = ? AND status = ?',
      [userId, courseId, 'completed']
    );
    const completedLessons = completed?.c ?? 0;
    const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    res.json({
      success: true,
      data: {
        isEnrolled: true,
        status: enrollment.status,
        progressPct,
        enrolledAt: enrollment.enrolled_at,
        completedAt: enrollment.completed_at,
      },
    });
  } catch (err) {
    sendError(res, err, 'Failed to get enrollment status');
  }
}

module.exports = {
  getCourseProgress,
  markLessonComplete,
  enrollStudent,
  getEnrollmentStatus,
};

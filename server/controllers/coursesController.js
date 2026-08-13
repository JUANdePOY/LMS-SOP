const courseModel = require('../models/courseModel');
const courseModuleModel = require('../models/courseModuleModel');
const courseContentModel = require('../models/courseContentModel');
const quizModel = require('../models/quizModel');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');
const db = require('../config/database');
const { broadcastSystemChange } = require('../services/notificationService');
const { getLeadershipTargetUserIds } = require('../services/notificationTargetService');

function sendError(res, err, fallback = 'Request failed') {
  const code = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const message = err.statusCode ? err.message : fallback;
  const body = { success: false, message };
  if (process.env.NODE_ENV !== 'production' && code === 500 && err && typeof err === 'object') {
    if (err.message && err.message !== message) body.details = err.message;
    if (err.sqlMessage) body.sqlMessage = err.sqlMessage;
    if (err.code) body.code = err.code;
  }
  if (code === 500) {
    console.error('[Courses Controller Error]', err);
  }
  return res.status(code).json(body);
}

async function enforceCourseScope(course, user) {
  if (!course || !user) return;
  const role = user.role || '';
  if (role === 'super_admin') return;

  const deptId = course.department_id;
  const courseBusinessId = course.business_id || null;

  if (role === 'admin') {
    if (!user.business_id) {
      const error = new Error('Your account has no business scope');
      error.statusCode = 403;
      throw error;
    }
    if (courseBusinessId && courseBusinessId !== user.business_id) {
      const error = new Error('Access denied: course is outside your business scope');
      error.statusCode = 403;
      throw error;
    }
    if (!courseBusinessId && deptId) {
      const [[dept]] = await db.query(
        'SELECT business_id FROM departments WHERE id = ?',
        [deptId]
      );
      if (!dept || dept.business_id !== user.business_id) {
        const error = new Error('Access denied: course is outside your business scope');
        error.statusCode = 403;
        throw error;
      }
    }
    return;
  }

  if (role === 'department_head') {
    const scopedDeptIds = user.scoped_department_ids || (user.department_id ? [user.department_id] : []);
    if (deptId && !scopedDeptIds.includes(deptId)) {
      const error = new Error('Access denied: course is outside your department scope');
      error.statusCode = 403;
      throw error;
    }
    return;
  }
}

function listCourses(req, res) {
  const { search, status, category, difficulty, instructor_id, page, limit, department_id, business_id } = req.query;
  const pageNum = parseInt(page || '1', 10);
  const limitNum = parseInt(limit || '20', 10);

  let effectiveBusinessId = business_id ? parseInt(business_id, 10) : undefined;
  let effectiveDepartmentId = department_id ? parseInt(department_id, 10) : undefined;
  if (req.user && req.user.role !== 'super_admin') {
    effectiveBusinessId = req.user.business_id;
    if (req.user.role === 'department_head' || req.user.role === 'employee') {
      effectiveDepartmentId = req.user.department_id;
    }
  }

  Promise.all([
    courseModel.listCourses({ search, status, category, difficulty, instructor_id, page: pageNum, limit: limitNum, department_id: effectiveDepartmentId, business_id: effectiveBusinessId }),
    courseModel.countCourses({ search, status, category, difficulty, instructor_id, department_id: effectiveDepartmentId, business_id: effectiveBusinessId }),
  ])
    .then(([data, total]) => {
      res.json({
        success: true,
        message: 'OK',
        data,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      });
    })
    .catch((err) => sendError(res, err, 'Failed to list courses'));
}

function getCourse(req, res) {
  courseModel.findById(parseInt(req.params.id, 10))
    .then((course) => {
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      return enforceCourseScope(course, req.user).then(() => {
        return res.json({ success: true, message: 'OK', data: course });
      });
    })
    .catch((err) => sendError(res, err, 'Failed to load course'));
}

function createCourse(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const { title, description, category, category_id, difficulty, thumbnail_url, prerequisites, learning_outcomes, max_enrollments, start_date, end_date, grading_scale, allow_self_enrollment, send_completion_certificates, status, department_id, business_id } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Course title is required', code: 'VALIDATION_ERROR' });
  }

  const doCreate = (effectiveBusinessId, effectiveDepartmentId) => {
    courseModel.create({
      title: title.trim(),
      description,
      category,
      category_id: category_id ? parseInt(category_id, 10) : null,
      difficulty,
      instructor_id: userId,
      thumbnail_url,
      prerequisites,
      learning_outcomes,
      max_enrollments: max_enrollments ? parseInt(max_enrollments, 10) : null,
      start_date,
      end_date,
      grading_scale,
      allow_self_enrollment,
      send_completion_certificates: send_completion_certificates === undefined ? true : send_completion_certificates,
      status: status || 'draft',
      department_id: effectiveDepartmentId,
      business_id: effectiveBusinessId,
    })
      .then((id) => {
        logAudit('course.create', userId, { courseId: id, title });
        const link = `/courses/${id}`;
        getLeadershipTargetUserIds(effectiveBusinessId, effectiveDepartmentId, userId)
          .then((targetUserIds) => {
            if (targetUserIds.length > 0) {
              broadcastSystemChange({
                title: 'New Course Available',
                body: title.trim(),
                type: 'info',
                link,
                entityType: 'course',
                entityId: id,
                targetUserIds,
              }).catch(() => {});
            }
          })
          .catch(() => {});
        return res.status(201).json({ success: true, message: 'Course created successfully', data: { id, title, status: status || 'draft' } });
      })
      .catch((err) => sendError(res, err, 'Failed to create course'));
  };

  const resolveBusinessId = async () => {
    if (req.user.role === 'super_admin') {
      if (business_id) return parseInt(business_id, 10);
      if (department_id) {
        const deptId = parseInt(department_id, 10);
        const [[dept]] = await db.query('SELECT business_id FROM departments WHERE id = ?', [deptId]);
        return dept ? dept.business_id : null;
      }
      return null;
    }

    if (!req.user.business_id) {
      return res.status(403).json({ success: false, message: 'No business scope assigned', code: 'NO_BUSINESS_SCOPE' });
    }

    if (department_id) {
      const deptId = parseInt(department_id, 10);
      const [[dept]] = await db.query('SELECT business_id FROM departments WHERE id = ?', [deptId]);
      if (!dept || dept.business_id !== req.user.business_id) {
        return res.status(403).json({ success: false, message: 'Cannot create courses in another business', code: 'BUSINESS_SCOPE_DENIED' });
      }
    }

    if (business_id && parseInt(business_id, 10) !== req.user.business_id) {
      return res.status(403).json({ success: false, message: 'Cannot create courses in another business', code: 'BUSINESS_SCOPE_DENIED' });
    }

    return req.user.business_id;
  };

  resolveBusinessId()
    .then((effectiveBusinessId) => {
      if (effectiveBusinessId === undefined) return;
      const effectiveDepartmentId = department_id ? parseInt(department_id, 10) : null;
      doCreate(effectiveBusinessId, effectiveDepartmentId);
    })
    .catch((err) => sendError(res, err, 'Failed to create course'));
}

function updateCourse(req, res) {
  const userId = req.user?.id;
  const courseId = parseInt(req.params.id, 10);

  courseModel.findById(courseId)
    .then((course) => {
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      return enforceCourseScope(course, req.user).then(() => applyCourseUpdate(req, courseId, userId, course));
    })
    .catch((err) => sendError(res, err, 'Failed to update course'));
}

function applyCourseUpdate(req, courseId, userId, course) {
  const allowed = [
    'title', 'description', 'category', 'category_id', 'difficulty', 'thumbnail_url',
    'prerequisites', 'learning_outcomes', 'max_enrollments', 'start_date',
    'end_date', 'grading_scale', 'allow_self_enrollment', 'send_completion_certificates', 'status', 'instructor_id'
  ];
  const updates = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      updates[key] = key === 'category_id' ? (req.body[key] ? parseInt(req.body[key], 10) : null) : req.body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ success: false, message: 'No changes provided', code: 'VALIDATION_ERROR' });
  }

  return courseModel.update(courseId, updates).then(() => {
    logAudit('course.update', userId, { courseId, updates });
    return res.json({ success: true, message: 'Course updated successfully', data: { id: courseId } });
  });
}

function deleteCourse(req, res) {
  const userId = req.user?.id;
  const courseId = parseInt(req.params.id, 10);

  courseModel.findById(courseId)
    .then((course) => {
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      return enforceCourseScope(course, req.user).then(() => {
        return courseModel.softDelete(courseId).then(() => {
          return quizModel.softDeleteByCourse(courseId).then(() => {
            logAudit('course.delete', userId, { courseId, title: course.title });
            return res.json({ success: true, message: 'Course deleted successfully' });
          });
        });
      });
    })
    .catch((err) => sendError(res, err, 'Failed to delete course'));
}

function listModules(req, res) {
  const courseId = parseInt(req.params.courseId, 10);
  const { search, type, page, limit } = req.query;
  const pageNum = parseInt(page || '1', 10);
  const limitNum = parseInt(limit || '50', 10);

  courseModel.findById(courseId)
    .then((course) => {
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      return enforceCourseScope(course, req.user).then(() => {
        return courseModuleModel.listModules(courseId, { search, type, page: pageNum, limit: limitNum })
          .then((modules) => {
            res.json({ success: true, message: 'OK', data: modules });
          });
      });
    })
    .catch((err) => sendError(res, err, 'Failed to list modules'));
}

function createModule(req, res) {
  const courseId = parseInt(req.params.courseId, 10);
  const userId = req.user?.id;

  courseModel.findById(courseId)
    .then((course) => {
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      return enforceCourseScope(course, req.user).then(() => {
        return courseModuleModel.create({
          course_id: courseId,
          ...req.body,
        });
      });
    })
    .then((id) => {
      logAudit('course.module.create', userId, { courseId, moduleId: id });
      return res.status(201).json({ success: true, message: 'Module created successfully', data: { id } });
    })
    .catch((err) => sendError(res, err, 'Failed to create module'));
}

function updateModule(req, res) {
  const moduleId = parseInt(req.params.moduleId, 10);
  const userId = req.user?.id;

  courseModuleModel.findById(moduleId)
    .then((mod) => {
      if (!mod) return res.status(404).json({ success: false, message: 'Module not found' });
      return courseModel.findById(mod.course_id)
        .then((course) => {
          if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
          return enforceCourseScope(course, req.user).then(() => {
            const allowed = ['title', 'description', 'type', 'order_index', 'release_date', 'due_date', 'is_graded', 'max_score', 'is_visible'];
            const updates = {};
            for (const key of allowed) {
              if (Object.prototype.hasOwnProperty.call(req.body, key)) {
                updates[key] = req.body[key];
              }
            }
            if (!Object.keys(updates).length) {
              return res.status(400).json({ success: false, message: 'No changes provided', code: 'VALIDATION_ERROR' });
            }
            return courseModuleModel.update(moduleId, updates).then(() => {
              logAudit('course.module.update', userId, { courseId: mod.course_id, moduleId, updates });
              return res.json({ success: true, message: 'Module updated successfully' });
            });
          });
        });
    })
    .catch((err) => sendError(res, err, 'Failed to update module'));
}

function deleteModule(req, res) {
  const moduleId = parseInt(req.params.moduleId, 10);
  const userId = req.user?.id;

  courseModuleModel.findById(moduleId)
    .then((mod) => {
      if (!mod) return res.status(404).json({ success: false, message: 'Module not found' });
      return courseModel.findById(mod.course_id)
        .then((course) => {
          if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
          return enforceCourseScope(course, req.user).then(() => {
            return courseModuleModel.softDelete(moduleId).then(() => {
              logAudit('course.module.delete', userId, { moduleId, courseId: mod.course_id });
              return res.json({ success: true, message: 'Module deleted successfully' });
            });
          });
        });
    })
    .catch((err) => sendError(res, err, 'Failed to delete module'));
}

function listContent(req, res) {
  const courseId = parseInt(req.params.courseId, 10);
  const moduleId = parseInt(req.params.moduleId, 10);
  const { search, type } = req.query;

  courseModel.findById(courseId)
    .then((course) => {
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      return enforceCourseScope(course, req.user).then(() => {
        return courseModuleModel.findById(moduleId)
          .then((mod) => {
            if (!mod) return res.status(404).json({ success: false, message: 'Module not found' });
            return courseContentModel.listContent(moduleId, { search, type })
              .then((content) => {
                res.json({ success: true, message: 'OK', data: content });
              });
          });
      });
    })
    .catch((err) => sendError(res, err, 'Failed to list content'));
}

function createContent(req, res) {
  const courseId = parseInt(req.params.courseId, 10);
  const moduleId = parseInt(req.params.moduleId, 10);
  const userId = req.user?.id;

  courseModel.findById(courseId)
    .then((course) => {
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      return enforceCourseScope(course, req.user).then(() => {
        return courseModuleModel.findById(moduleId)
          .then((mod) => {
            if (!mod) return res.status(404).json({ success: false, message: 'Module not found' });
            return courseContentModel.create({
              module_id: moduleId,
              ...req.body,
            });
          });
      });
    })
    .then((id) => {
      logAudit('course.content.create', userId, { courseId, moduleId, contentId: id });
      return res.status(201).json({ success: true, message: 'Content created successfully', data: { id } });
    })
    .catch((err) => sendError(res, err, 'Failed to create content'));
}

function updateContent(req, res) {
  const contentId = parseInt(req.params.contentId, 10);
  const userId = req.user?.id;

  courseContentModel.findById(contentId)
    .then((content) => {
      if (!content) return res.status(404).json({ success: false, message: 'Content not found' });
      return courseModuleModel.findById(content.module_id)
        .then((mod) => {
          if (!mod) return res.status(404).json({ success: false, message: 'Module not found' });
          return courseModel.findById(mod.course_id)
            .then((course) => {
              if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
              return enforceCourseScope(course, req.user).then(() => {
                const allowed = ['title', 'type', 'description', 'order_index', 'url', 'duration', 'is_required', 'allow_access_after', 'chapters', 'thumbnail_url'];
                const updates = {};
                for (const key of allowed) {
                  if (Object.prototype.hasOwnProperty.call(req.body, key)) {
                    updates[key] = req.body[key];
                  }
                }
                if (!Object.keys(updates).length) {
                  return res.status(400).json({ success: false, message: 'No changes provided', code: 'VALIDATION_ERROR' });
                }
                return courseContentModel.update(contentId, updates).then(() => {
                  logAudit('course.content.update', userId, { contentId, updates });
                  return res.json({ success: true, message: 'Content updated successfully' });
                });
              });
            });
        });
    })
    .catch((err) => sendError(res, err, 'Failed to update content'));
}

function deleteContent(req, res) {
  const contentId = parseInt(req.params.contentId, 10);
  const userId = req.user?.id;

  courseContentModel.findById(contentId)
    .then((content) => {
      if (!content) return res.status(404).json({ success: false, message: 'Content not found' });
      return courseModuleModel.findById(content.module_id)
        .then((mod) => {
          if (!mod) return res.status(404).json({ success: false, message: 'Module not found' });
          return courseModel.findById(mod.course_id)
            .then((course) => {
              if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
              return enforceCourseScope(course, req.user).then(() => {
                return courseContentModel.softDelete(contentId).then(() => {
                  logAudit('course.content.delete', userId, { contentId });
                  return res.json({ success: true, message: 'Content deleted successfully' });
                });
              });
            });
        });
    })
    .catch((err) => sendError(res, err, 'Failed to delete content'));
}

function archiveCourse(req, res) {
  const courseId = parseInt(req.params.id, 10);
  const userId = req.user?.id;

  courseModel.findById(courseId)
    .then((course) => {
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      return enforceCourseScope(course, req.user).then(() => {
        return getLeadershipTargetUserIds(course.business_id, course.department_id, userId).then((targetUserIds) => {
          return courseModel.update(courseId, { status: 'archived' }).then(() => {
            logAudit('course.archived', userId, { courseId });
            if (targetUserIds.length > 0) {
              broadcastSystemChange({
                title: 'Course Archived',
                body: course.title,
                type: 'warning',
                link: `/courses/${courseId}`,
                entityType: 'course',
                entityId: courseId,
                targetUserIds,
              }).catch(() => {});
            }
            return res.json({ success: true, message: 'Course archived successfully' });
          });
        });
      });
    })
    .catch((err) => sendError(res, err, 'Failed to archive course'));
}

function publishCourse(req, res) {
  const courseId = parseInt(req.params.id, 10);
  const userId = req.user?.id;

  courseModel.findById(courseId)
    .then((course) => {
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      return enforceCourseScope(course, req.user).then(() => {
        return getLeadershipTargetUserIds(course.business_id, course.department_id, userId).then((targetUserIds) => {
          return courseModel.update(courseId, { status: 'published' }).then(() => {
            logAudit('course.published', userId, { courseId });
            if (targetUserIds.length > 0) {
              broadcastSystemChange({
                title: 'New Course Published',
                body: course.title,
                type: 'success',
                link: `/courses/${courseId}`,
                entityType: 'course',
                entityId: courseId,
                targetUserIds,
              }).catch(() => {});
            }
            return res.json({ success: true, message: 'Course published successfully' });
          });
        });
      });
    })
    .catch((err) => sendError(res, err, 'Failed to publish course'));
}

function exportCourseCSV(req, res) {
  const courseId = parseInt(req.params.id, 10);
  courseModel.findById(courseId)
    .then((course) => {
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      return enforceCourseScope(course, req.user).then(() => {
        return courseModel.getCourseEnrollments(courseId)
          .then((enrollments) => {
            const rows = [
              ['Employee ID', 'Name', 'Email', 'Status', 'Progress (%)', 'Enrolled At', 'Completed At'],
              ...(enrollments || []).map((e) => [
                e.user_id || '',
                e.user_name || '',
                e.user_email || '',
                e.status || '',
                e.progress_percentage ?? 0,
                e.enrolled_at || e.created_at || '',
                e.completed_at || '',
              ]),
            ];
            const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="course-${courseId}-enrollments.csv"`);
            res.send(csv);
          });
      });
    })
    .catch((err) => sendError(res, err, 'Failed to export CSV'));
}

function exportCourseExcel(req, res) {
  const courseId = parseInt(req.params.id, 10);
  courseModel.findById(courseId)
    .then((course) => {
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      return enforceCourseScope(course, req.user).then(() => {
        return courseModel.getCourseEnrollments(courseId)
          .then((enrollments) => {
            const rows = [
              ['Employee ID', 'Name', 'Email', 'Status', 'Progress (%)', 'Enrolled At', 'Completed At'],
              ...(enrollments || []).map((e) => [
                e.user_id || '',
                e.user_name || '',
                e.user_email || '',
                e.status || '',
                e.progress_percentage ?? 0,
                e.enrolled_at || e.created_at || '',
                e.completed_at || '',
              ]),
            ];
            const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="course-${courseId}-enrollments.xlsx"`);
            res.send(csv);
          });
      });
    })
    .catch((err) => sendError(res, err, 'Failed to export Excel'));
}

function exportCoursePDF(req, res) {
  const courseId = parseInt(req.params.id, 10);
  courseModel.findById(courseId)
    .then((course) => {
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      return enforceCourseScope(course, req.user).then(() => {
        return courseModel.getCourseEnrollments(courseId)
          .then((enrollments) => {
            const rows = [
              ['Employee ID', 'Name', 'Email', 'Status', 'Progress (%)', 'Enrolled At', 'Completed At'],
              ...(enrollments || []).map((e) => [
                e.user_id || '',
                e.user_name || '',
                e.user_email || '',
                e.status || '',
                e.progress_percentage ?? 0,
                e.enrolled_at || e.created_at || '',
                e.completed_at || '',
              ]),
            ];
            const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="course-${courseId}-enrollments.pdf"`);
            res.send(csv);
          });
      });
    })
    .catch((err) => sendError(res, err, 'Failed to export PDF'));
}

async function uploadImage(req, res) {
  const courseId = parseInt(req.params.courseId, 10);
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image file uploaded', code: 'NO_FILE' });
  }
  try {
    const course = await courseModel.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    await enforceCourseScope(course, req.user);

    const { saveCourseImage } = require('../middleware/courseImageUpload');
    const url = await saveCourseImage(courseId, req.file);
    logAudit('course.image.uploaded', req.user.id, { course_id: courseId, url });
    res.status(201).json({ success: true, data: { view_url: url }, message: 'Image uploaded successfully' });
  } catch (err) {
    console.error('[Course Image Upload Error]', err);
    res.status(500).json({ success: false, message: 'Failed to upload image', code: 'UPLOAD_ERROR' });
  }
}

function listCategories(req, res) {
  const { status } = req.query;
  courseModel.listCategories({ status })
    .then((categories) => {
      res.json({ success: true, message: 'OK', data: categories });
    })
    .catch((err) => sendError(res, err, 'Failed to list categories'));
}

module.exports = {
  listCourses,
  listCategories,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  listModules,
  createModule,
  updateModule,
  deleteModule,
  listContent,
  createContent,
  updateContent,
  deleteContent,
  archiveCourse,
  publishCourse,
  exportCourseCSV,
  exportCourseExcel,
  exportCoursePDF,
  uploadImage,
};

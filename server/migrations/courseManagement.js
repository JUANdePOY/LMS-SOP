const db = require('../config/database');

const COURSE_MANAGEMENT_MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    category VARCHAR(100) DEFAULT NULL,
    difficulty ENUM('beginner','intermediate','advanced','all_levels') NOT NULL DEFAULT 'beginner',
    status ENUM('draft','published','archived','under_review') NOT NULL DEFAULT 'draft',
    instructor_id INT DEFAULT NULL,
    thumbnail_url VARCHAR(500) DEFAULT NULL,
    prerequisites JSON DEFAULT NULL,
    learning_outcomes JSON DEFAULT NULL,
    max_enrollments INT DEFAULT NULL,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    grading_scale ENUM('STANDARD','PERCENTAGE','PASS_FAIL') NOT NULL DEFAULT 'STANDARD',
    allow_self_enrollment BOOLEAN NOT NULL DEFAULT TRUE,
    send_completion_certificates BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_courses_status (status),
    INDEX idx_courses_category (category),
    INDEX idx_courses_instructor (instructor_id),
    INDEX idx_courses_deleted (is_deleted)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `ALTER TABLE courses ADD COLUMN IF NOT EXISTS category_id INT DEFAULT NULL AFTER category`,
  `ALTER TABLE courses ADD CONSTRAINT fk_courses_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL`,
  `CREATE INDEX IF NOT EXISTS idx_courses_category_id ON courses(category_id)`,

  `CREATE TABLE IF NOT EXISTS course_modules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    type ENUM('chapter','unit','lesson','section','topic') NOT NULL DEFAULT 'chapter',
    order_index INT NOT NULL DEFAULT 0,
    release_date DATETIME DEFAULT NULL,
    due_date DATETIME DEFAULT NULL,
    is_graded BOOLEAN NOT NULL DEFAULT FALSE,
    max_score INT DEFAULT NULL,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_course_modules_course (course_id),
    INDEX idx_course_modules_order (course_id, order_index)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS module_content (
    id INT AUTO_INCREMENT PRIMARY KEY,
    module_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    type ENUM('video','reading','document','quiz','assignment','link','presentation','downloadable','live_session','interactive','sop','certificate') NOT NULL DEFAULT 'reading',
    description TEXT DEFAULT NULL,
    order_index INT NOT NULL DEFAULT 0,
    url VARCHAR(500) DEFAULT NULL,
    duration INT DEFAULT NULL,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    allow_access_after DATETIME DEFAULT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE,
    INDEX idx_module_content_module (module_id),
    INDEX idx_module_content_order (module_id, order_index)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS course_enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('instructor','teaching_assistant','learner','guest') NOT NULL DEFAULT 'learner',
    status ENUM('pending','active','completed','dropped','suspended') NOT NULL DEFAULT 'active',
    enrolled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME DEFAULT NULL,
    progress_percentage INT NOT NULL DEFAULT 0,
    final_grade DECIMAL(5,2) DEFAULT NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_course_enrollment (course_id, user_id),
    INDEX idx_enrollments_user (user_id),
    INDEX idx_enrollments_course (course_id),
    INDEX idx_enrollments_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS quizzes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    module_id INT DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    time_limit INT DEFAULT NULL,
    max_score INT NOT NULL DEFAULT 100,
    attempts_allowed INT NOT NULL DEFAULT 1,
    passing_score INT DEFAULT NULL,
    feedback_policy ENUM('immediate','on_completion','manual') NOT NULL DEFAULT 'immediate',
    status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE SET NULL,
    INDEX idx_quizzes_course (course_id),
    INDEX idx_quizzes_module (module_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS quiz_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    type ENUM('multiple_choice','multiple_select','fill_blank','essay') NOT NULL DEFAULT 'multiple_choice',
    question_text TEXT NOT NULL,
    options JSON DEFAULT NULL,
    correct_answer JSON DEFAULT NULL,
    points INT NOT NULL DEFAULT 1,
    order_index INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    INDEX idx_quiz_questions_quiz (quiz_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS quiz_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    user_id INT NOT NULL,
    answers JSON DEFAULT NULL,
    score INT DEFAULT NULL,
    max_score INT DEFAULT NULL,
    submitted_at DATETIME DEFAULT NULL,
    graded_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_quiz_submissions_user (user_id),
    INDEX idx_quiz_submissions_quiz (quiz_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    module_id INT DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    due_date DATETIME DEFAULT NULL,
    max_score INT NOT NULL DEFAULT 100,
    submission_type ENUM('file','text','both') NOT NULL DEFAULT 'text',
    allow_late_submission BOOLEAN NOT NULL DEFAULT TRUE,
    late_penalty DECIMAL(5,2) DEFAULT NULL,
    status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE SET NULL,
    INDEX idx_assignments_course (course_id),
    INDEX idx_assignments_module (module_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT DEFAULT NULL,
    file_path VARCHAR(500) DEFAULT NULL,
    file_name VARCHAR(255) DEFAULT NULL,
    score INT DEFAULT NULL,
    feedback TEXT DEFAULT NULL,
    status ENUM('draft','submitted','graded','returned') NOT NULL DEFAULT 'draft',
    submitted_at DATETIME DEFAULT NULL,
    graded_at DATETIME DEFAULT NULL,
    graded_by INT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_submissions_user (user_id),
    INDEX idx_submissions_assignment (assignment_id),
    INDEX idx_submissions_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS grades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    user_id INT NOT NULL,
    item_id INT DEFAULT NULL,
    item_type ENUM('quiz','assignment','module','course') NOT NULL DEFAULT 'course',
    score DECIMAL(6,2) NOT NULL DEFAULT 0,
    max_score DECIMAL(6,2) NOT NULL DEFAULT 100,
    letter_grade VARCHAR(5) DEFAULT NULL,
    feedback TEXT DEFAULT NULL,
    graded_by INT DEFAULT NULL,
    is_finalized BOOLEAN NOT NULL DEFAULT FALSE,
    is_released BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_grades_user (user_id),
    INDEX idx_grades_course (course_id),
    INDEX idx_grades_item (item_id, item_type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS discussions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    module_id INT DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    reply_count INT NOT NULL DEFAULT 0,
    created_by INT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_discussions_course (course_id),
    INDEX idx_discussions_module (module_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS discussion_replies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    discussion_id INT NOT NULL,
    parent_reply_id INT DEFAULT NULL,
    user_id INT NOT NULL,
    reply_text TEXT NOT NULL,
    is_instructor BOOLEAN NOT NULL DEFAULT FALSE,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (discussion_id) REFERENCES discussions(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_reply_id) REFERENCES discussion_replies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_discussion_replies_discussion (discussion_id),
    INDEX idx_discussion_replies_parent (parent_reply_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `ALTER TABLE course_enrollments ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE quizzes ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE quiz_questions ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE quiz_submissions ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE assignments ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE submissions ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE grades ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE discussions ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE discussion_replies ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE`,

  `CREATE TABLE IF NOT EXISTS content_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    enrollment_id INT NOT NULL,
    content_id INT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    time_spent INT DEFAULT NULL,
    completed_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(id) ON DELETE CASCADE,
    FOREIGN KEY (content_id) REFERENCES module_content(id) ON DELETE CASCADE,
    UNIQUE KEY uk_content_progress (enrollment_id, content_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `ALTER TABLE module_content ADD COLUMN IF NOT EXISTS requires_quiz_pass BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE module_content ADD COLUMN IF NOT EXISTS passing_score INT DEFAULT NULL`,
  `ALTER TABLE module_content ADD COLUMN IF NOT EXISTS quiz_id INT DEFAULT NULL`,
  `ALTER TABLE module_content ADD COLUMN IF NOT EXISTS certificate_template_id INT DEFAULT NULL`,
  `ALTER TABLE module_content ADD CONSTRAINT fk_module_content_certificate_template FOREIGN KEY (certificate_template_id) REFERENCES certificate_templates(id) ON DELETE SET NULL`,
  `CREATE INDEX IF NOT EXISTS idx_module_content_certificate_template ON module_content(certificate_template_id)`,
  `ALTER TABLE module_content ADD COLUMN IF NOT EXISTS chapters JSON DEFAULT NULL`,
  `ALTER TABLE module_content ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500) DEFAULT NULL`,
  `ALTER TABLE module_content MODIFY COLUMN type ENUM('video','reading','document','quiz','assignment','link','presentation','downloadable','live_session','interactive','sop','certificate') NOT NULL DEFAULT 'reading'`,

  `ALTER TABLE module_content ADD COLUMN IF NOT EXISTS bunny_library_id VARCHAR(80) DEFAULT NULL`,
  `ALTER TABLE module_content ADD COLUMN IF NOT EXISTS bunny_video_id VARCHAR(120) DEFAULT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_module_content_bunny ON module_content (bunny_library_id, bunny_video_id)`,

  `CREATE TABLE IF NOT EXISTS lesson_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    lesson_id INT NOT NULL,
    course_id INT NOT NULL,
    status ENUM('locked','unlocked','in_progress','completed') NOT NULL DEFAULT 'locked',
    completed_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES module_content(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY uk_lesson_progress (user_id, lesson_id),
    INDEX idx_lesson_progress_user (user_id),
    INDEX idx_lesson_progress_course (course_id),
    INDEX idx_lesson_progress_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `ALTER TABLE courses ADD COLUMN IF NOT EXISTS department_id INT DEFAULT NULL,
   ADD CONSTRAINT fk_courses_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
   ADD INDEX idx_courses_department (department_id)`,

  `ALTER TABLE course_enrollments ADD COLUMN is_deleted TINYINT NOT NULL DEFAULT 0`,
  `ALTER TABLE course_enrollments ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,

  `CREATE TABLE IF NOT EXISTS learning_paths (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    department_id INT DEFAULT NULL,
    is_active TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS learning_path_courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    path_id INT NOT NULL,
    course_id INT NOT NULL,
    position INT NOT NULL DEFAULT 0,
    is_required TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_path_course (path_id, course_id),
    FOREIGN KEY (path_id) REFERENCES learning_paths(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

async function runCourseMigrations() {
  const dbPool = require('../config/database');
  for (const sql of COURSE_MANAGEMENT_MIGRATIONS) {
    if (!sql || !sql.trim()) continue;
    try {
      await dbPool.query(sql);
    } catch (err) {
      const isDuplicateKey = /errno: 121|Duplicate key on write or update/.test(err.message);
      const ignoreCodes = ['ER_DUP_COLUMN', 'ER_TABLE_EXISTS_ERROR', 'ER_DUP_KEYNAME', 1060, 1050, 1061, 121];
      if (ignoreCodes.includes(err.code) || ignoreCodes.includes(err.errno) || isDuplicateKey) {
        console.log('Course migration skipped:', sql.split('\n')[0]);
      } else {
        console.error('Course migration error:', err.message);
      }
    }
  }
}

module.exports = { runCourseMigrations, COURSE_MANAGEMENT_MIGRATIONS };


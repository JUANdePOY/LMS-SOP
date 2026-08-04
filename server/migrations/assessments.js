const MIGRATIONS = [
  `ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS quiz_type ENUM('practice','final') NOT NULL DEFAULT 'practice' AFTER attempts_allowed`,
  `ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS randomize_questions BOOLEAN NOT NULL DEFAULT FALSE AFTER quiz_type`,
  `ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS shuffle_options BOOLEAN NOT NULL DEFAULT FALSE AFTER randomize_questions`,
  `ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS grading_method ENUM('auto','manual','highest') NOT NULL DEFAULT 'auto' AFTER shuffle_options`,

  `CREATE TABLE IF NOT EXISTS quiz_question_banks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_qb_course (course_id),
    INDEX idx_qb_deleted (is_deleted)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS question_bank_id INT DEFAULT NULL AFTER quiz_id`,
  `ALTER TABLE quiz_questions MODIFY COLUMN type ENUM('multiple_choice','multiple_select','multi_select','true_false','short_answer','fill_blank','essay') NOT NULL DEFAULT 'multiple_choice'`,

  `CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    user_id INT NOT NULL,
    attempt_number INT NOT NULL DEFAULT 1,
    status ENUM('in_progress','completed','graded','cancelled') NOT NULL DEFAULT 'in_progress',
    score INT DEFAULT NULL,
    max_score INT DEFAULT NULL,
    percentage DECIMAL(5,2) DEFAULT NULL,
    passed BOOLEAN DEFAULT NULL,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at DATETIME DEFAULT NULL,
    time_taken_sec INT DEFAULT NULL,
    timed_out BOOLEAN NOT NULL DEFAULT FALSE,
    answers JSON DEFAULT NULL,
    violation_count INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE KEY uq_quiz_attempt (quiz_id, user_id, attempt_number),
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_attempts_quiz_user (quiz_id, user_id),
    INDEX idx_attempts_user (user_id),
    INDEX idx_attempts_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS quiz_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    attempt_id INT NOT NULL,
    quiz_id INT NOT NULL,
    user_id INT NOT NULL,
    score INT DEFAULT NULL,
    max_score INT DEFAULT NULL,
    percentage DECIMAL(5,2) DEFAULT NULL,
    passed BOOLEAN DEFAULT NULL,
    feedback JSON DEFAULT NULL,
    is_manual_review BOOLEAN NOT NULL DEFAULT FALSE,
    graded_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    INDEX idx_results_quiz (quiz_id),
    INDEX idx_results_user (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS quiz_violations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    attempt_id INT NOT NULL,
    user_id INT NOT NULL,
    quiz_id INT NOT NULL,
    type ENUM('tab_switch','copy_attempt','screenshot_attempt','right_click','fullscreen_exit','devtools_opened') NOT NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSON DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_violations_attempt (attempt_id),
    INDEX idx_violations_user (user_id),
    INDEX idx_violations_quiz (quiz_id),
    INDEX idx_violations_type (type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS quiz_attempt_overrides (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    user_id INT NOT NULL,
    granted_by INT DEFAULT NULL,
    attempts_granted INT NOT NULL DEFAULT 1,
    reason TEXT DEFAULT NULL,
    expires_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_override_quiz_user (quiz_id, user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS quiz_hierarchy (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    parent_id INT DEFAULT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    level INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES quiz_hierarchy(id) ON DELETE CASCADE,
    INDEX idx_hierarchy_quiz (quiz_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS hierarchy_id INT DEFAULT NULL AFTER quiz_id`,
  `ALTER TABLE quiz_questions ADD CONSTRAINT fk_question_hierarchy FOREIGN KEY (hierarchy_id) REFERENCES quiz_hierarchy(id) ON DELETE SET NULL`,
];

async function runAssessmentsMigrations(db) {
  for (const sql of MIGRATIONS) {
    try {
      await db.query(sql);
    } catch (err) {
      const ignoreCodes = ['ER_DUP_COLUMN', 'ER_TABLE_EXISTS_ERROR', 'ER_DUP_KEYNAME', 'ER_CANT_MODIFY_SQL', 1060, 1050, 1061, 1091, 121];
      if (ignoreCodes.includes(err.code) || ignoreCodes.includes(err.errno)) {
        console.log('Assessments migration skipped (already exists):', sql.split('\n')[0].trim());
      } else {
        console.error('Assessments migration error:', err.message);
        console.error('Offending SQL:', sql.split('\n')[0].trim());
        throw err;
      }
    }
  }
  console.log('Assessments migrations applied');
}

module.exports = { runAssessmentsMigrations, MIGRATIONS };

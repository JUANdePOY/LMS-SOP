const db = require('./config/database');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

async function seed() {
  console.log('Seeding LMS-SOP demo data...');

  const roles = [
    { name: 'super_admin', display_name: 'Super Admin', description: 'Full system access' },
    { name: 'admin', display_name: 'Admin', description: 'Admin with scope management' },
    { name: 'department_head', display_name: 'Department Head', description: 'Department-level manager' },
    { name: 'employee', display_name: 'Employee', description: 'Standard user / learner' },
  ];

  for (const role of roles) {
    await db.query(
      `INSERT INTO roles (name, display_name, description, is_active)
       VALUES (?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE display_name = VALUES(display_name)`,
      [role.name, role.display_name, role.description]
    );
  }

  const permissions = [
    { name: 'view_dashboard', display_name: 'View Dashboard', category: 'dashboard' },
    { name: 'manage_users', display_name: 'Manage Users', category: 'users' },
    { name: 'manage_departments', display_name: 'Manage Departments', category: 'departments' },
    { name: 'manage_sops', display_name: 'Manage SOPs', category: 'sops' },
    { name: 'manage_courses', display_name: 'Manage Courses', category: 'courses' },
    { name: 'manage_assessments', display_name: 'Manage Assessments', category: 'assessments' },
    { name: 'view_reports', display_name: 'View Reports', category: 'reports' },
    { name: 'manage_settings', display_name: 'Manage Settings', category: 'settings' },
    { name: 'view_audit_logs', display_name: 'View Audit Logs', category: 'audit' },
  ];

  for (const perm of permissions) {
    await db.query(
      `INSERT INTO permissions (name, display_name, category)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE display_name = VALUES(display_name)`,
      [perm.name, perm.display_name, perm.category]
    );
  }

  const rolePermissions = [
    ['super_admin', 'view_dashboard'],
    ['super_admin', 'manage_users'],
    ['super_admin', 'manage_departments'],
    ['super_admin', 'manage_sops'],
    ['super_admin', 'manage_courses'],
    ['super_admin', 'manage_assessments'],
    ['super_admin', 'view_reports'],
    ['super_admin', 'manage_settings'],
    ['super_admin', 'view_audit_logs'],
    ['admin', 'view_dashboard'],
    ['admin', 'manage_users'],
    ['admin', 'manage_departments'],
    ['admin', 'manage_sops'],
    ['admin', 'manage_courses'],
    ['admin', 'manage_assessments'],
    ['admin', 'view_reports'],
    ['department_head', 'view_dashboard'],
    ['department_head', 'manage_sops'],
    ['department_head', 'manage_courses'],
    ['department_head', 'manage_assessments'],
    ['department_head', 'view_reports'],
    ['employee', 'view_dashboard'],
    ['employee', 'view_reports'],
  ];

  for (const [roleName, permName] of rolePermissions) {
    await db.query(
      `INSERT INTO role_permissions (role_name, permission_name)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE role_name = role_name`,
      [roleName, permName]
    );
  }

  const departments = [
    { name: 'Operations', code: 'OPS', description: 'Operations department' },
    { name: 'HR & Admin', code: 'HR', description: 'Human Resources & Administration' },
    { name: 'Sales & Marketing', code: 'S&M', description: 'Sales and Marketing department' },
    { name: 'Finance', code: 'FIN', description: 'Finance department' },
    { name: 'IT', code: 'IT', description: 'Information Technology department' },
  ];

  for (const dept of departments) {
    await db.query(
      `INSERT INTO departments (name, code, description)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE description = VALUES(description)`,
      [dept.name, dept.code, dept.description]
    );
  }

  const hashedPassword = await bcrypt.hash('password123', SALT_ROUNDS);

  const users = [
    { full_name: 'John D.', email: 'john.d@organization.com', role: 'super_admin', department_id: 1, position_title: 'System Administrator', employee_id: 'EMP-001', contact_number: '+1-555-0101', employment_status: 'Regular', date_hired: '2020-01-15', birthdate: '1985-03-10', address: '123 Main St' },
    { full_name: 'Jane S.', email: 'jane.s@organization.com', role: 'admin', department_id: 2, position_title: 'HR Manager', employee_id: 'EMP-002', contact_number: '+1-555-0102', employment_status: 'Regular', date_hired: '2021-06-01', birthdate: '1990-07-22', address: '456 Oak Ave' },
    { full_name: 'Mike R.', email: 'mike.r@organization.com', role: 'department_head', department_id: 1, position_title: 'Operations Lead', employee_id: 'EMP-003', contact_number: '+1-555-0103', employment_status: 'Regular', date_hired: '2019-03-15', birthdate: '1988-11-05', address: '789 Pine Rd' },
    { full_name: 'Sarah M.', email: 'sarah.m@organization.com', role: 'employee', department_id: 3, position_title: 'Sales Representative', employee_id: 'EMP-004', contact_number: '+1-555-0104', employment_status: 'Regular', date_hired: '2022-09-01', birthdate: '1995-01-18', address: '321 Elm St' },
    { full_name: 'Tom K.', email: 'tom.k@organization.com', role: 'employee', department_id: 5, position_title: 'IT Specialist', employee_id: 'EMP-005', contact_number: '+1-555-0105', employment_status: 'Regular', date_hired: '2021-02-10', birthdate: '1992-06-30', address: '654 Maple Dr' },
    { full_name: 'Lisa W.', email: 'lisa.w@organization.com', role: 'employee', department_id: 4, position_title: 'Financial Analyst', employee_id: 'EMP-006', contact_number: '+1-555-0106', employment_status: 'Regular', date_hired: '2023-01-15', birthdate: '1993-09-14', address: '987 Cedar Ln' },
    { full_name: 'David P.', email: 'david.p@organization.com', role: 'employee', department_id: 1, position_title: 'Operations Coordinator', employee_id: 'EMP-007', contact_number: '+1-555-0107', employment_status: 'Probationary', date_hired: '2024-04-01', birthdate: '1998-04-25', address: '147 Birch Way' },
    { full_name: 'Emma L.', email: 'emma.l@organization.com', role: 'employee', department_id: 2, position_title: 'HR Assistant', employee_id: 'EMP-008', contact_number: '+1-555-0108', employment_status: 'Regular', date_hired: '2023-08-15', birthdate: '1996-12-08', address: '258 Spruce Ct' },
  ];

  for (const user of users) {
    await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, department_id, position_title, employee_id, contact_number, employment_status, date_hired, birthdate, address, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role), department_id = VALUES(department_id), position_title = VALUES(position_title), employee_id = VALUES(employee_id), contact_number = VALUES(contact_number), employment_status = VALUES(employment_status), date_hired = VALUES(date_hired), birthdate = VALUES(birthdate), address = VALUES(address), is_active = TRUE`,
      [user.full_name, user.email, hashedPassword, user.role, user.department_id, user.position_title, user.employee_id, user.contact_number, user.employment_status, user.date_hired, user.birthdate, user.address]
    );
  }

  // ---------------------------------------------------------------------------
  // Assessments demo data (Stage 1)
  // ---------------------------------------------------------------------------
  const quizModel = require('./models/quizModel');
  const courseModel = require('./models/courseModel');

  // Demo course — "Security Awareness Fundamentals" (instructor: Mike R., id 3)
  const existingCourse = (await db.query(
    'SELECT id FROM courses WHERE title = ? LIMIT 1',
    ['Security Awareness Fundamentals']
  ))[0];
  const demoCourseId = existingCourse
    ? existingCourse.id
    : await courseModel.create({
      title: 'Security Awareness Fundamentals',
      description: 'Foundational security and SOP navigation training.',
      difficulty: 'beginner',
      status: 'published',
      instructor_id: 3,
      allow_self_enrollment: true,
      send_completion_certificates: true,
    });

  // Enroll Sarah (user 4) as a learner on the demo course
  await db.query(
    `INSERT INTO course_enrollments (course_id, user_id, role, status)
     SELECT ?, 4, 'student', 'active'
     WHERE NOT EXISTS (SELECT 1 FROM course_enrollments WHERE course_id = ? AND user_id = 4 LIMIT 1)`,
    [demoCourseId, demoCourseId]
  );

  // Practice quiz: SOP Navigation Basics
  const practiceQuiz = (await db.query(
    'SELECT id FROM quizzes WHERE course_id = ? AND title = ? LIMIT 1',
    [demoCourseId, 'SOP Navigation Basics']
  ))[0];
  const practiceQuizId = practiceQuiz
    ? practiceQuiz.id
    : await quizModel.create({
      course_id: demoCourseId,
      module_id: null,
      title: 'SOP Navigation Basics',
      description: 'Practice quiz covering SOP navigation and structure.',
      time_limit: 10,
      max_score: 100,
      attempts_allowed: 3,
      passing_score: 70,
      status: 'published',
      quiz_type: 'practice',
      randomize_questions: true,
      shuffle_options: true,
      grading_method: 'auto',
    });

  // Wipe & reseed questions so re-running seed stays idempotent
  await db.query('DELETE FROM quiz_questions WHERE quiz_id = ?', [practiceQuizId]);
  const practiceQuestions = [
    { type: 'multiple_choice', question_text: 'Where do you access the main SOP document viewer?', options: ['My Learning', 'Course Library', 'SOP Library', 'Profile'], correct_answer: 'SOP Library', points: 20, order_index: 1 },
    { type: 'true_false', question_text: 'Each SOP step has an estimated completion time.', options: ['True', 'False'], correct_answer: 'True', points: 20, order_index: 2 },
    { type: 'multiple_select', question_text: 'Which statuses can an SOP have? (select two)', options: ['Draft', 'Published', 'Archived', 'Deleted'], correct_answer: ['Published', 'Archived'], points: 20, order_index: 3 },
    { type: 'multiple_choice', question_text: 'SOPs are organized into sections and steps.', options: ['True', 'False'], correct_answer: 'True', points: 20, order_index: 4 },
    { type: 'multiple_choice', question_text: 'You can acknowledge an SOP from the SOP Library.', options: ['True', 'False'], correct_answer: 'True', points: 20, order_index: 5 },
  ];
  const practiceQuestionIds = [];
  for (const q of practiceQuestions) {
    const qid = await quizModel.createQuestion({ ...q, quiz_id: practiceQuizId });
    practiceQuestionIds.push(qid);
  }

  // Final quiz: Security Fundamentals Final
  const finalQuiz = (await db.query(
    'SELECT id FROM quizzes WHERE course_id = ? AND title = ? LIMIT 1',
    [demoCourseId, 'Security Fundamentals Final']
  ))[0];
  const finalQuizId = finalQuiz
    ? finalQuiz.id
    : await quizModel.create({
      course_id: demoCourseId,
      module_id: null,
      title: 'Security Fundamentals Final',
      description: 'Final assessment for the Security Awareness course.',
      time_limit: 20,
      max_score: 100,
      attempts_allowed: 1,
      passing_score: 75,
      status: 'published',
      quiz_type: 'final',
      randomize_questions: false,
      shuffle_options: false,
      grading_method: 'highest',
    });

  await db.query('DELETE FROM quiz_questions WHERE quiz_id = ?', [finalQuizId]);
  const finalQuestions = [
    { type: 'multiple_choice', question_text: 'What is the first step when handling a security incident?', options: ['Report it', 'Fix it quietly', 'Ignore it', 'Escalate to IT'], correct_answer: ['Report it'], points: 25, order_index: 1 },
    { type: 'true_false', question_text: 'Screenshots are permitted during a secured quiz attempt.', options: ['True', 'False'], correct_answer: 'False', points: 25, order_index: 2 },
    { type: 'multiple_choice', question_text: 'A passing score on final quizzes is?', options: ['60%', '70%', '75%', '80%'], correct_answer: ['75%'], points: 25, order_index: 3 },
    { type: 'multiple_select', question_text: 'Which actions are flagged by the integrity monitor? (select all that apply)', options: ['Tab switch', 'Copy/paste', 'Right-click', 'Fullscreen exit', 'Devtools open'], correct_answer: ['Tab switch', 'Copy/paste', 'Fullscreen exit', 'Devtools open'], points: 25, order_index: 4 },
  ];
  for (const q of finalQuestions) await quizModel.createQuestion({ ...q, quiz_id: finalQuizId });

   // Demo attempt for Sarah (user 4) on the practice quiz: 80/100, passed, 3 violations
   const existingAttempt = (await db.query(
    'SELECT id FROM quiz_attempts WHERE quiz_id = ? AND user_id = 4 AND attempt_number = 1 LIMIT 1',
    [practiceQuizId]
  ))[0];
  let attemptId = existingAttempt ? existingAttempt.id : null;
  if (!attemptId && practiceQuestionIds.length) {
    const answers = {};
    answers[practiceQuestionIds[0]] = 'SOP Library';        // correct
    answers[practiceQuestionIds[1]] = 'True';                // correct
    answers[practiceQuestionIds[2]] = ['Published'];         // incorrect (missing 'Archived')
    answers[practiceQuestionIds[3]] = 'True';                // correct
    answers[practiceQuestionIds[4]] = 'True';                // correct
    attemptId = await quizModel.createAttempt({
      quiz_id: practiceQuizId,
      user_id: 4,
      attempt_number: 1,
      answers,
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
      violation_count: 3,
    });
    await quizModel.createResult({
      attempt_id: attemptId,
      quiz_id: practiceQuizId,
      user_id: 4,
      score: 80,
      max_score: 100,
      percentage: 80.0,
      passed: true,
      feedback: [
        { questionId: practiceQuestionIds[0], isCorrect: true, points: 20, selected: 'SOP Library' },
        { questionId: practiceQuestionIds[1], isCorrect: true, points: 20, selected: 'True' },
        { questionId: practiceQuestionIds[2], isCorrect: false, points: 20, selected: ['Published'] },
        { questionId: practiceQuestionIds[3], isCorrect: true, points: 20, selected: 'True' },
        { questionId: practiceQuestionIds[4], isCorrect: true, points: 20, selected: 'True' },
      ],
      is_manual_review: false,
    });
    await quizModel.logViolation({ attempt_id: attemptId, user_id: 4, quiz_id: practiceQuizId, type: 'tab_switch', metadata: { reason: 'window focus lost' } });
    await quizModel.logViolation({ attempt_id: attemptId, user_id: 4, quiz_id: practiceQuizId, type: 'copy_attempt', metadata: { reason: 'copy key event intercepted' } });
    await quizModel.logViolation({ attempt_id: attemptId, user_id: 4, quiz_id: practiceQuizId, type: 'screenshot_attempt', metadata: { reason: 'Print Screen detected' } });
  }

  // Override: Mike (id 3) grants Sarah (id 4) one extra attempt on the final quiz
  await db.query(
    `INSERT IGNORE INTO quiz_attempt_overrides (quiz_id, user_id, granted_by, attempts_granted, reason)
     SELECT ?, 4, 3, 1, ? WHERE NOT EXISTS (
       SELECT 1 FROM quiz_attempt_overrides WHERE quiz_id = ? AND user_id = 4 AND granted_by = 3 LIMIT 1
     )`,
    [finalQuizId, 'Extra attempt granted for demo (Sarah had a timeout on a prior attempt).', finalQuizId]
  );

  console.log('Assessments demo data created successfully!');
  console.log('  Demo course: Security Awareness Fundamentals');
  console.log(`    - Practice quiz: SOP Navigation Basics (id ${practiceQuizId})`);
  console.log(`    - Final quiz: Security Fundamentals Final (id ${finalQuizId})`);
  console.log('  Demo learner: sarah.m@organization.com — 1 scored attempt (80/100), 3 violations, 1 active override');

  console.log('Seed data created successfully!');
  console.log('Demo accounts:');
  users.forEach(u => {
    console.log(`  ${u.email} / password123 (${u.role})`);
  });
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
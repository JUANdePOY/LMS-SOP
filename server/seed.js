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
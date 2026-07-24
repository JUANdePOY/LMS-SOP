-- LMS-SOP Seed Data
-- MySQL
-- Database: u607968802_lms_sop
-- Run after schema.sql

USE u607968802_lms_sop;

-- ============================================================
-- Seed Roles
-- ============================================================
INSERT INTO roles (name, display_name, description, is_active) VALUES
  ('super_admin', 'Super Admin', 'Full system access', TRUE),
  ('admin', 'Admin', 'Admin with scope management', TRUE),
  ('department_head', 'Department Head', 'Department-level manager', TRUE),
  ('employee', 'Employee', 'Standard user / learner', TRUE)
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

-- ============================================================
-- Seed Permissions
-- ============================================================
INSERT INTO permissions (name, display_name, category) VALUES
  ('view_dashboard', 'View Dashboard', 'dashboard'),
  ('manage_users', 'Manage Users', 'users'),
  ('manage_departments', 'Manage Departments', 'departments'),
  ('manage_sops', 'Manage SOPs', 'sops'),
  ('manage_courses', 'Manage Courses', 'courses'),
  ('manage_assessments', 'Manage Assessments', 'assessments'),
  ('view_reports', 'View Reports', 'reports'),
  ('manage_settings', 'Manage Settings', 'settings'),
  ('view_audit_logs', 'View Audit Logs', 'audit')
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

-- ============================================================
-- Seed Role-Permission Mappings
-- ============================================================
INSERT INTO role_permissions (role_name, permission_name) VALUES
  ('super_admin', 'view_dashboard'),
  ('super_admin', 'manage_users'),
  ('super_admin', 'manage_departments'),
  ('super_admin', 'manage_sops'),
  ('super_admin', 'manage_courses'),
  ('super_admin', 'manage_assessments'),
  ('super_admin', 'view_reports'),
  ('super_admin', 'manage_settings'),
  ('super_admin', 'view_audit_logs'),
  ('admin', 'view_dashboard'),
  ('admin', 'manage_users'),
  ('admin', 'manage_departments'),
  ('admin', 'manage_sops'),
  ('admin', 'manage_courses'),
  ('admin', 'manage_assessments'),
  ('admin', 'view_reports'),
  ('department_head', 'view_dashboard'),
  ('department_head', 'manage_sops'),
  ('department_head', 'manage_courses'),
  ('department_head', 'manage_assessments'),
  ('department_head', 'view_reports'),
  ('employee', 'view_dashboard'),
  ('employee', 'view_reports')
ON DUPLICATE KEY UPDATE role_name = role_name;

-- ============================================================
-- Seed Departments
-- ============================================================
INSERT INTO departments (name, code, description) VALUES
  ('Operations', 'OPS', 'Operations department'),
  ('HR & Admin', 'HR', 'Human Resources & Administration'),
  ('Sales & Marketing', 'S&M', 'Sales and Marketing department'),
  ('Finance', 'FIN', 'Finance department'),
  ('IT', 'IT', 'Information Technology department')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- ============================================================
-- Seed Users
-- Password for all accounts: password123
-- ============================================================
SET @hashed_password = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RKsgYyKZG';

INSERT INTO users (full_name, email, password_hash, role, department_id, position_title, employee_id, contact_number, employment_status, date_hired, birthdate, address, is_active) VALUES
  ('John D.', 'john.d@organization.com', @hashed_password, 'super_admin', 1, 'System Administrator', 'EMP-001', '+1-555-0101', 'Regular', '2020-01-15', '1985-03-10', '123 Main St', TRUE),
  ('Jane S.', 'jane.s@organization.com', @hashed_password, 'admin', 2, 'HR Manager', 'EMP-002', '+1-555-0102', 'Regular', '2021-06-01', '1990-07-22', '456 Oak Ave', TRUE),
  ('Mike R.', 'mike.r@organization.com', @hashed_password, 'department_head', 1, 'Operations Lead', 'EMP-003', '+1-555-0103', 'Regular', '2019-03-15', '1988-11-05', '789 Pine Rd', TRUE),
  ('Sarah M.', 'sarah.m@organization.com', @hashed_password, 'employee', 3, 'Sales Representative', 'EMP-004', '+1-555-0104', 'Regular', '2022-09-01', '1995-01-18', '321 Elm St', TRUE),
  ('Tom K.', 'tom.k@organization.com', @hashed_password, 'employee', 5, 'IT Specialist', 'EMP-005', '+1-555-0105', 'Regular', '2021-02-10', '1992-06-30', '654 Maple Dr', TRUE),
  ('Lisa W.', 'lisa.w@organization.com', @hashed_password, 'employee', 4, 'Financial Analyst', 'EMP-006', '+1-555-0106', 'Regular', '2023-01-15', '1993-09-14', '987 Cedar Ln', TRUE),
  ('David P.', 'david.p@organization.com', @hashed_password, 'employee', 1, 'Operations Coordinator', 'EMP-007', '+1-555-0107', 'Probationary', '2024-04-01', '1998-04-25', '147 Birch Way', TRUE),
  ('Emma L.', 'emma.l@organization.com', @hashed_password, 'employee', 2, 'HR Assistant', 'EMP-008', '+1-555-0108', 'Regular', '2023-08-15', '1996-12-08', '258 Spruce Ct', TRUE)
ON DUPLICATE KEY UPDATE email = VALUES(email);
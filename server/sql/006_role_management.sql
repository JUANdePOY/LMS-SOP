-- PAFR Database Migration 006: Role Management & Settings
-- Expands the role system from binary (admin/reservist) to granular admin roles
-- Adds scope columns for unit-level admin restrictions

-- Step 1: Expand role ENUM on users table
ALTER TABLE users
  MODIFY COLUMN role ENUM('admin', 'admin_arsen', 'admin_group', 'admin_squadron', 'reservist')
  NOT NULL DEFAULT 'reservist';

-- Step 2: Add scope columns to users table for unit-level admins
ALTER TABLE users
  ADD COLUMN scope_arsen_id BIGINT NULL AFTER role,
  ADD COLUMN scope_group_id BIGINT NULL AFTER scope_arsen_id,
  ADD COLUMN scope_squadron_id BIGINT NULL AFTER scope_group_id,
  ADD CONSTRAINT fk_user_arsen FOREIGN KEY (scope_arsen_id) REFERENCES arsens(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_user_group FOREIGN KEY (scope_group_id) REFERENCES `groups`(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_user_squadron FOREIGN KEY (scope_squadron_id) REFERENCES squadron(id) ON DELETE SET NULL;

-- Step 3: Create roles reference table for UI display and management
CREATE TABLE IF NOT EXISTS roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 4: Seed roles
INSERT INTO roles (name, display_name, description) VALUES
  ('admin',              'System Administrator',   'Full system access — all modules, all units, all settings'),
  ('admin_arsen',        'ARCEN Administrator',    'Manages a specific ARCEN and its child groups/squadrons'),
  ('admin_group',        'Group Administrator',    'Manages a specific group and its child squadrons'),
  ('admin_squadron',     'Squadron Administrator', 'Manages a specific squadron and its reservists'),
  ('reservist',          'Reservist',              'Standard reservist — view-only access to own records')
AS new_roles
ON DUPLICATE KEY UPDATE display_name = new_roles.display_name, description = new_roles.description;

-- Step 5: Create user_roles audit table for tracking role changes
CREATE TABLE IF NOT EXISTS user_role_history (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  old_role VARCHAR(50) NULL,
  new_role VARCHAR(50) NOT NULL,
  old_scope_arsen_id BIGINT NULL,
  new_scope_arsen_id BIGINT NULL,
  old_scope_group_id BIGINT NULL,
  new_scope_group_id BIGINT NULL,
  old_scope_squadron_id BIGINT NULL,
  new_scope_squadron_id BIGINT NULL,
  changed_by BIGINT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

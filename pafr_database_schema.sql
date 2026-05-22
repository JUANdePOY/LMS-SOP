-- PAFR Database Schema
-- Generated from current MySQL database (pafr)
-- MySQL WampServer Compatible
-- Character Set: utf8mb4
-- Storage Engine: InnoDB

-- Drop database if exists and create fresh
DROP DATABASE IF EXISTS pafr;
CREATE DATABASE pafr CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pafr;

-- -----------------------------------------------------
-- Table users
-- -----------------------------------------------------
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'admin_arsen', 'admin_group', 'admin_squadron', 'reservist') NOT NULL DEFAULT 'reservist',
    scope_arsen_id BIGINT NULL,
    scope_group_id BIGINT NULL,
    scope_squadron_id BIGINT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    last_login_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_active (is_active),
    CONSTRAINT fk_user_arsen FOREIGN KEY (scope_arsen_id) REFERENCES arsens(id) ON DELETE SET NULL,
    CONSTRAINT fk_user_group FOREIGN KEY (scope_group_id) REFERENCES `groups`(id) ON DELETE SET NULL,
    CONSTRAINT fk_user_squadron FOREIGN KEY (scope_squadron_id) REFERENCES squadron(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table reservists
-- -----------------------------------------------------
CREATE TABLE reservists (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    `rank` VARCHAR(50) NOT NULL,
    service_number VARCHAR(100) NOT NULL,
    date_of_birth DATE NULL,
    place_of_birth VARCHAR(200) NULL,
    age INT NULL,
    sex ENUM('Male', 'Female', 'Other') NULL,
    civil_status ENUM('Single', 'Married', 'Widowed', 'Separated', 'Divorced') NULL,
    citizenship VARCHAR(100) DEFAULT 'Filipino',
    height DECIMAL(5,2) NULL,
    weight DECIMAL(5,2) NULL,
    blood_type ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown') DEFAULT 'Unknown',
    phone_number VARCHAR(20) NULL,
    address TEXT NULL,
    reserve_center VARCHAR(200) NULL,
    category ENUM('1st Category', '2nd Category', '3rd Category') NULL,
    date_enlisted DATE NULL,
    source_of_commission ENUM('ROTC', 'BCMT', 'MOTC', 'Direct Commission') NULL,
    rank_date_appointment DATE NULL,
    position VARCHAR(200) NULL,
    specialization VARCHAR(200) NULL,
    reserve_status ENUM('Ready Reserve', 'Standby Reserve', 'Retired') DEFAULT 'Ready Reserve',
    highest_education VARCHAR(100) NULL,
    course_degree VARCHAR(200) NULL,
    school VARCHAR(300) NULL,
    year_graduated INT NULL,
    occupation VARCHAR(200) NULL,
    employer VARCHAR(200) NULL,
    office_address TEXT NULL,
    basic_training_completed VARCHAR(100) NULL,
    basic_training_date DATE NULL,
    emergency_contact_name VARCHAR(200) NULL,
    emergency_contact_phone VARCHAR(20) NULL,
    emergency_contact_address TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY user_id (user_id),
    UNIQUE KEY service_number (service_number),
    INDEX idx_service_number (service_number),
    INDEX idx_name (last_name, first_name),
    INDEX idx_active (is_active),
    INDEX idx_rank (`rank`),
    INDEX idx_reserve_status (reserve_status),
    CONSTRAINT reservists_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table arsens
-- -----------------------------------------------------
CREATE TABLE arsens (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    location VARCHAR(500) NULL,
    commander_name VARCHAR(200) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY code (code),
    INDEX idx_code (code),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table groups
-- -----------------------------------------------------
CREATE TABLE `groups` (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    arsen_id BIGINT NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    commander_name VARCHAR(200) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_group_code (arsen_id, code),
    INDEX idx_arsen (arsen_id),
    CONSTRAINT groups_ibfk_1 FOREIGN KEY (arsen_id) REFERENCES arsens(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table squadron
-- -----------------------------------------------------
CREATE TABLE squadron (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    group_id BIGINT NOT NULL,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) NULL,
    location VARCHAR(200) NULL,
    specialization VARCHAR(100) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_group (group_id),
    INDEX idx_location (location),
    INDEX idx_specialization (specialization),
    CONSTRAINT squadron_ibfk_1 FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table reservist_assignments
-- -----------------------------------------------------
CREATE TABLE reservist_assignments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    reservist_id BIGINT NOT NULL,
    group_id BIGINT NOT NULL,
    squadron_id BIGINT NOT NULL,
    assigned_date DATE NOT NULL,
    is_primary TINYINT(1) NOT NULL DEFAULT 1,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_group_squadron (group_id, squadron_id),
    INDEX idx_reservist (reservist_id),
    INDEX idx_reservist_active_assignments (reservist_id, is_primary, group_id, squadron_id),
    CONSTRAINT reservist_assignments_ibfk_1 FOREIGN KEY (reservist_id) REFERENCES reservists(id) ON DELETE CASCADE,
    CONSTRAINT reservist_assignments_ibfk_2 FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
    CONSTRAINT reservist_assignments_ibfk_3 FOREIGN KEY (squadron_id) REFERENCES squadron(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table areas
-- -----------------------------------------------------
CREATE TABLE areas (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    parent_area_id BIGINT NULL,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT NULL,
    geographic_boundary JSON NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY code (code),
    INDEX idx_parent (parent_area_id),
    INDEX idx_code (code),
    CONSTRAINT areas_ibfk_1 FOREIGN KEY (parent_area_id) REFERENCES areas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table trainings
-- -----------------------------------------------------
CREATE TABLE trainings (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(500) NOT NULL,
    description TEXT NULL,
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    venue VARCHAR(500) NOT NULL,
    area_id BIGINT NULL,
    status ENUM('draft', 'published', 'ongoing', 'completed', 'cancelled') NOT NULL DEFAULT 'draft',
    capacity INT NULL,
    created_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_dates (start_datetime, end_datetime),
    INDEX idx_area (area_id),
    INDEX idx_trainings_dates_status (start_datetime, status),
    CONSTRAINT trainings_ibfk_1 FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL,
    CONSTRAINT trainings_ibfk_2 FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table activities
-- -----------------------------------------------------
CREATE TABLE activities (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    training_id BIGINT NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    location VARCHAR(500) NULL,
    instructor VARCHAR(200) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_training (training_id),
    INDEX idx_timing (start_time, end_time),
    CONSTRAINT activities_ibfk_1 FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table internal_training_participants
-- -----------------------------------------------------
CREATE TABLE internal_training_participants (
    training_id BIGINT NOT NULL,
    reservist_id BIGINT NOT NULL,
    squadron_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (training_id, reservist_id),
    INDEX idx_itp_training_squadron (training_id, squadron_id),
    INDEX idx_itp_squadron (squadron_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table internal_training_attachments
-- -----------------------------------------------------
CREATE TABLE internal_training_attachments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    training_id BIGINT NOT NULL,
    kind VARCHAR(32) NOT NULL DEFAULT 'letter_order',
    stored_filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(500) NOT NULL,
    mime_type VARCHAR(127) NOT NULL,
    size_bytes BIGINT UNSIGNED NOT NULL,
    storage_backend VARCHAR(32) NOT NULL DEFAULT 'local',
    relative_path VARCHAR(1024) NOT NULL,
    uploaded_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_internal_training_kind (training_id, kind),
    INDEX idx_internal_training_created (training_id, created_at),
    CONSTRAINT internal_training_attachments_ibfk_1 FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table external_trainings
-- -----------------------------------------------------
CREATE TABLE external_trainings (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    start_date DATE NOT NULL,
    start_time TIME NULL,
    venue VARCHAR(255) NULL,
    status ENUM('draft', 'open', 'closed', 'completed') NOT NULL DEFAULT 'draft',
    capacity INT UNSIGNED NULL,
    squadron_limits JSON NULL COMMENT 'Per-squadron slot limits (array of {squadron_id, slot_limit})',
    registration_fields JSON NULL COMMENT 'Dynamic form field schema (array of field configs)',
    instructor VARCHAR(200) NULL COMMENT 'Facilitator or instructor name',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_status (status),
    INDEX idx_start_date (start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table external_training_attachments
-- -----------------------------------------------------
CREATE TABLE external_training_attachments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    external_training_id INT UNSIGNED NOT NULL,
    kind VARCHAR(32) NOT NULL DEFAULT 'letter_order',
    stored_filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(500) NOT NULL,
    mime_type VARCHAR(127) NOT NULL,
    size_bytes BIGINT UNSIGNED NOT NULL,
    storage_backend VARCHAR(32) NOT NULL DEFAULT 'local',
    relative_path VARCHAR(1024) NOT NULL,
    uploaded_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_external_training_kind (external_training_id, kind),
    INDEX idx_external_training_created (external_training_id, created_at),
    CONSTRAINT external_training_attachments_ibfk_1 FOREIGN KEY (external_training_id) REFERENCES external_trainings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table training_registrations
-- -----------------------------------------------------
CREATE TABLE training_registrations (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    training_id INT UNSIGNED NOT NULL,
    participant_data JSON NULL COMMENT 'Key-value pairs keyed by field ID',
    registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_training_id (training_id),
    INDEX idx_registered_at (registered_at),
    CONSTRAINT training_registrations_ibfk_1 FOREIGN KEY (training_id) REFERENCES external_trainings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table attendance
-- -----------------------------------------------------
CREATE TABLE attendance (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    reservist_id BIGINT NOT NULL,
    training_id BIGINT NOT NULL,
    status ENUM('present', 'absent', 'late', 'excused', 'pending') NOT NULL DEFAULT 'pending',
    check_in_time DATETIME NULL,
    check_out_time DATETIME NULL,
    location_check_in JSON NULL,
    qr_code_used VARCHAR(255) NULL,
    notes TEXT NULL,
    recorded_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_reservist_training (reservist_id, training_id),
    INDEX idx_training_status (training_id, status),
    INDEX idx_reservist (reservist_id),
    INDEX idx_dates (created_at),
    INDEX idx_attendance_training_reservist (training_id, reservist_id, status),
    CONSTRAINT attendance_ibfk_1 FOREIGN KEY (reservist_id) REFERENCES reservists(id) ON DELETE CASCADE,
    CONSTRAINT attendance_ibfk_2 FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE,
    CONSTRAINT attendance_ibfk_3 FOREIGN KEY (recorded_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table readiness
-- -----------------------------------------------------
CREATE TABLE readiness (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    reservist_id BIGINT NOT NULL,
    assessment_date DATE NOT NULL,
    medical_status ENUM('fit', 'unfit', 'limited', 'pending') NOT NULL DEFAULT 'pending',
    medical_notes TEXT NULL,
    physical_score DECIMAL(5,2) NOT NULL,
    physical_test_date DATE NULL,
    weapons_qualification ENUM('expert', 'sharpshooter', 'marksman', 'qualified', 'unqualified', 'none') DEFAULT 'none',
    weapons_test_date DATE NULL,
    overall_score DECIMAL(5,2) GENERATED ALWAYS AS (
        ROUND(
            (CASE WHEN medical_status = 'fit' THEN 100
                  WHEN medical_status = 'limited' THEN 70
                  WHEN medical_status = 'pending' THEN 50
                  ELSE 0 END
             + physical_score
             + CASE weapons_qualification
                WHEN 'expert' THEN 100
                WHEN 'sharpshooter' THEN 90
                WHEN 'marksman' THEN 80
                WHEN 'qualified' THEN 70
                ELSE 0 END
            ) / 3, 2)
    ) STORED,
    assessed_by BIGINT NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_reservist_date (reservist_id, assessment_date),
    INDEX idx_reservist (reservist_id),
    INDEX idx_assessment_date (assessment_date),
    INDEX idx_overall_score (overall_score),
    INDEX idx_readiness_reservist_date (reservist_id, assessment_date DESC),
    CONSTRAINT readiness_ibfk_1 FOREIGN KEY (reservist_id) REFERENCES reservists(id) ON DELETE CASCADE,
    CONSTRAINT readiness_ibfk_2 FOREIGN KEY (assessed_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table supplies
-- -----------------------------------------------------
CREATE TABLE supplies (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NULL,
    unit VARCHAR(20) NOT NULL,
    quantity_available INT NOT NULL DEFAULT 0,
    reorder_level INT NOT NULL DEFAULT 10,
    max_stock INT NULL,
    location VARCHAR(200) NULL,
    supplier VARCHAR(200) NULL,
    last_ordered_date DATE NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table supply_issuances
-- -----------------------------------------------------
CREATE TABLE supply_issuances (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    reservist_id BIGINT NOT NULL,
    supply_id BIGINT NOT NULL,
    quantity_issued INT NOT NULL,
    issued_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    due_return_date DATE NOT NULL,
    returned_date DATE NULL,
    returned_quantity INT NULL,
    condition_on_issue ENUM('new', 'good', 'fair', 'poor') DEFAULT 'good',
    condition_on_return ENUM('new', 'good', 'fair', 'poor', 'damaged') NULL,
    issued_by BIGINT NOT NULL,
    received_by BIGINT NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_reservist (reservist_id),
    INDEX idx_supply (supply_id),
    INDEX idx_due_date (due_return_date),
    INDEX idx_issuances_reservist_due (reservist_id, returned_date, due_return_date),
    CONSTRAINT supply_issuances_ibfk_1 FOREIGN KEY (reservist_id) REFERENCES reservists(id) ON DELETE CASCADE,
    CONSTRAINT supply_issuances_ibfk_2 FOREIGN KEY (supply_id) REFERENCES supplies(id) ON DELETE CASCADE,
    CONSTRAINT supply_issuances_ibfk_3 FOREIGN KEY (issued_by) REFERENCES users(id),
    CONSTRAINT supply_issuances_ibfk_4 FOREIGN KEY (received_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table reports
-- -----------------------------------------------------
CREATE TABLE reports (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(500) NOT NULL,
    event_type ENUM('internal', 'external') NOT NULL DEFAULT 'internal',
    event_source_id BIGINT DEFAULT NULL COMMENT 'FK to trainings.id or external_trainings.id',
    event_date DATE DEFAULT NULL,
    summary TEXT DEFAULT NULL,
    type ENUM('attendance', 'readiness', 'logistics', 'custom') NOT NULL,
    format ENUM('pdf', 'excel', 'csv') NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size INT NULL,
    parameters JSON NULL,
    generated_by BIGINT NOT NULL,
    generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NULL,
    is_recurring TINYINT(1) DEFAULT 0,
    schedule_pattern VARCHAR(100) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_generated_at (generated_at),
    INDEX idx_generated_by (generated_by),
    CONSTRAINT reports_ibfk_1 FOREIGN KEY (generated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table report_participants
-- -----------------------------------------------------
CREATE TABLE report_participants (
    report_id BIGINT NOT NULL,
    reservist_id BIGINT NOT NULL,
    squadron_id BIGINT DEFAULT NULL,
    attendance_status ENUM('present', 'absent', 'late', 'excused') NOT NULL DEFAULT 'present',
    notes VARCHAR(500) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (report_id, reservist_id),
    INDEX idx_rp_report (report_id),
    INDEX idx_rp_reservist (reservist_id),
    INDEX idx_rp_squadron (squadron_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table report_documentations
-- -----------------------------------------------------
CREATE TABLE report_documentations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    report_id BIGINT NOT NULL,
    original_filename VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size INT DEFAULT NULL,
    mime_type VARCHAR(100) DEFAULT NULL,
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_rd_report (report_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table alerts
-- -----------------------------------------------------
CREATE TABLE alerts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    target_role ENUM('admin', 'reservist', 'all') NOT NULL DEFAULT 'all',
    target_group_id BIGINT NULL,
    target_squadron_id BIGINT NULL,
    target_area_id BIGINT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    start_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    end_date DATE NULL,
    created_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_target (target_role, target_group_id, target_squadron_id),
    INDEX idx_active_dates (is_active, start_date, end_date),
    CONSTRAINT alerts_ibfk_1 FOREIGN KEY (target_group_id) REFERENCES `groups`(id) ON DELETE SET NULL,
    CONSTRAINT alerts_ibfk_2 FOREIGN KEY (target_squadron_id) REFERENCES squadron(id) ON DELETE SET NULL,
    CONSTRAINT alerts_ibfk_3 FOREIGN KEY (target_area_id) REFERENCES areas(id) ON DELETE SET NULL,
    CONSTRAINT alerts_ibfk_4 FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table user_alerts
-- -----------------------------------------------------
CREATE TABLE user_alerts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    alert_id BIGINT NOT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    read_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_alert (user_id, alert_id),
    INDEX idx_unread (user_id, is_read),
    CONSTRAINT user_alerts_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT user_alerts_ibfk_2 FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table system_settings
-- -----------------------------------------------------
CREATE TABLE system_settings (
    `key` VARCHAR(100) PRIMARY KEY,
    `value` JSON NOT NULL,
    description TEXT NULL,
    updated_by BIGINT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT system_settings_ibfk_1 FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table audit_logs
-- -----------------------------------------------------
CREATE TABLE audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_timestamp (created_at),
    CONSTRAINT audit_logs_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table roles
-- -----------------------------------------------------
CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table user_role_history
-- -----------------------------------------------------
CREATE TABLE user_role_history (
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
    INDEX idx_user (user_id),
    INDEX idx_changed_at (changed_at),
    CONSTRAINT user_role_history_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT user_role_history_ibfk_2 FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

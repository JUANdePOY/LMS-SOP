-- Migration: Attendance QR code scanning system
-- Adds QR code support, facilitator tracking, external training attendance, and scan audit log

-- Add qr_code column to reservists if not exists
ALTER TABLE `reservists`
  ADD COLUMN `qr_code` VARCHAR(255) UNIQUE NULL AFTER `service_number`,
  ADD INDEX `idx_qr_code` (`qr_code`);

-- Add facilitator and event_type columns to attendance
ALTER TABLE `attendance`
  ADD COLUMN `event_type` ENUM('internal', 'external') NOT NULL DEFAULT 'internal' AFTER `training_id`,
  ADD COLUMN `external_training_id` BIGINT NULL AFTER `event_type`,
  ADD COLUMN `scan_method` ENUM('qr_scanner', 'camera', 'manual') NULL AFTER `qr_code_used`,
  ADD COLUMN `scan_timestamp` DATETIME NULL AFTER `scan_method`,
  ADD INDEX `idx_external_training` (`external_training_id`),
  ADD INDEX `idx_event_type` (`event_type`);

-- External training attendance table (for registered external participants)
CREATE TABLE IF NOT EXISTS `external_training_attendance` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `external_training_id` BIGINT NOT NULL,
  `registration_id` BIGINT NULL,
  `reservist_id` BIGINT NULL,
  `participant_name` VARCHAR(300) NULL,
  `participant_data` JSON NULL,
  `status` ENUM('present', 'absent', 'late', 'excused', 'pending') NOT NULL DEFAULT 'pending',
  `check_in_time` DATETIME NULL,
  `check_out_time` DATETIME NULL,
  `scan_method` ENUM('qr_scanner', 'camera', 'manual') NULL,
  `qr_code_scanned` VARCHAR(255) NULL,
  `notes` TEXT NULL,
  `recorded_by` BIGINT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`external_training_id`) REFERENCES `external_trainings`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`registration_id`) REFERENCES `training_registrations`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`reservist_id`) REFERENCES `reservists`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`),
  INDEX `idx_eta_training` (`external_training_id`),
  INDEX `idx_eta_reservist` (`reservist_id`),
  INDEX `idx_eta_registration` (`registration_id`),
  INDEX `idx_eta_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Scan audit log for tracking all scan attempts (successful and failed)
CREATE TABLE IF NOT EXISTS `scan_audit_log` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `training_id` BIGINT NULL,
  `external_training_id` BIGINT NULL,
  `event_type` ENUM('internal', 'external') NOT NULL,
  `qr_code_scanned` VARCHAR(255) NOT NULL,
  `reservist_id` BIGINT NULL,
  `scan_result` ENUM('success', 'not_registered', 'invalid_qr_code', 'event_inactive', 'duplicate', 'capacity_full') NOT NULL,
  `scan_method` ENUM('qr_scanner', 'camera', 'manual') NULL,
  `device_info` VARCHAR(500) NULL,
  `facilitator_id` BIGINT NULL,
  `error_message` VARCHAR(500) NULL,
  `scanned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`training_id`) REFERENCES `trainings`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`external_training_id`) REFERENCES `external_trainings`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`reservist_id`) REFERENCES `reservists`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`facilitator_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_sal_training` (`training_id`),
  INDEX `idx_sal_external` (`external_training_id`),
  INDEX `idx_sal_qr_code` (`qr_code_scanned`),
  INDEX `idx_sal_result` (`scan_result`),
  INDEX `idx_sal_time` (`scanned_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Facilitator assignment table (which users can facilitate which events)
CREATE TABLE IF NOT EXISTS `training_facilitators` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `training_id` BIGINT NULL,
  `external_training_id` BIGINT NULL,
  `user_id` BIGINT NOT NULL,
  `assigned_by` BIGINT NULL,
  `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`training_id`) REFERENCES `trainings`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`external_training_id`) REFERENCES `external_trainings`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  UNIQUE KEY `uk_tf_training_user` (`training_id`, `user_id`),
  UNIQUE KEY `uk_tf_external_user` (`external_training_id`, `user_id`),
  INDEX `idx_tf_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

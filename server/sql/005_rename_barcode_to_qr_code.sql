-- Migration 005: Rename barcode columns to qr_code
-- Renames all existing barcode columns, indexes, and enum values to qr_code equivalents

-- 1. Rename reservists.barcode to qr_code
ALTER TABLE `reservists`
  CHANGE COLUMN `barcode` `qr_code` VARCHAR(255) NULL,
  DROP INDEX `idx_barcode`,
  DROP INDEX `barcode`,
  ADD UNIQUE KEY `qr_code` (`qr_code`),
  ADD INDEX `idx_qr_code` (`qr_code`);

-- 2. Update attendance.scan_method enum from barcode_scanner to qr_scanner
ALTER TABLE `attendance`
  MODIFY COLUMN `scan_method` ENUM('qr_scanner', 'camera', 'manual') NULL;

-- 3. Rename external_training_attendance.barcode_scanned to qr_code_scanned and update enum
ALTER TABLE `external_training_attendance`
  CHANGE COLUMN `barcode_scanned` `qr_code_scanned` VARCHAR(255) NULL,
  MODIFY COLUMN `scan_method` ENUM('qr_scanner', 'camera', 'manual') NULL;

-- 4. Rename scan_audit_log columns and update enums
ALTER TABLE `scan_audit_log`
  CHANGE COLUMN `barcode_scanned` `qr_code_scanned` VARCHAR(255) NOT NULL,
  MODIFY COLUMN `scan_method` ENUM('qr_scanner', 'camera', 'manual') NULL,
  MODIFY COLUMN `scan_result` ENUM('success', 'not_registered', 'invalid_qr_code', 'event_inactive', 'duplicate', 'capacity_full') NOT NULL,
  DROP INDEX `idx_sal_barcode`,
  ADD INDEX `idx_sal_qr_code` (`qr_code_scanned`);

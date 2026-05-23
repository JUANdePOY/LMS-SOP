-- Migration: Reports enhancements
-- Adds event_type to reports, plus report_participants and report_documentations tables

ALTER TABLE `reports`
  ADD COLUMN `event_type` enum('internal','external') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'internal' AFTER `title`,
  ADD COLUMN `event_source_id` bigint DEFAULT NULL COMMENT 'FK to trainings.id or external_trainings.id' AFTER `event_type`,
  ADD COLUMN `event_date` date DEFAULT NULL AFTER `event_source_id`,
  ADD COLUMN `summary` text COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `event_date`;

CREATE TABLE IF NOT EXISTS `report_participants` (
  `report_id` bigint NOT NULL,
  `reservist_id` bigint NOT NULL,
  `squadron_id` bigint DEFAULT NULL,
  `attendance_status` enum('present','absent','late','excused') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'present',
  `notes` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`report_id`, `reservist_id`),
  KEY `idx_rp_report` (`report_id`),
  KEY `idx_rp_reservist` (`reservist_id`),
  KEY `idx_rp_squadron` (`squadron_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `report_documentations` (
  `id` bigint NOT NULL AUTO_INCREMENT, 
  `report_id` bigint NOT NULL,
  `original_filename` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int DEFAULT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rd_report` (`report_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

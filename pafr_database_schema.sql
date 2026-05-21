-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: May 21, 2026 at 08:18 PM
-- Server version: 8.4.7
-- PHP Version: 8.3.28

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `pafr`
--

-- --------------------------------------------------------

--
-- Table structure for table `activities`
--

DROP TABLE IF EXISTS `activities`;
CREATE TABLE IF NOT EXISTS `activities` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `training_id` bigint NOT NULL,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `location` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `instructor` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_training` (`training_id`),
  KEY `idx_timing` (`start_time`,`end_time`)
) ;

-- --------------------------------------------------------

--
-- Table structure for table `alerts`
--

DROP TABLE IF EXISTS `alerts`;
CREATE TABLE IF NOT EXISTS `alerts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_role` enum('admin','reservist','all') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all',
  `target_group_id` bigint DEFAULT NULL,
  `target_squadron_id` bigint DEFAULT NULL,
  `target_area_id` bigint DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `start_date` date NOT NULL DEFAULT (curdate()),
  `end_date` date DEFAULT NULL,
  `created_by` bigint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `target_group_id` (`target_group_id`),
  KEY `target_squadron_id` (`target_squadron_id`),
  KEY `target_area_id` (`target_area_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_target` (`target_role`,`target_group_id`,`target_squadron_id`),
  KEY `idx_active_dates` (`is_active`,`start_date`,`end_date`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `alerts`
--

INSERT INTO `alerts` (`id`, `title`, `message`, `target_role`, `target_group_id`, `target_squadron_id`, `target_area_id`, `is_active`, `start_date`, `end_date`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'Mandatory Training Reminder', 'All reservists are reminded to attend the Basic Infantry Training 2026 scheduled June 1-15. Ensure you are physically prepared.', 'all', NULL, NULL, NULL, 1, '2026-05-10', '2026-05-31', 1, '2026-05-01 09:00:00', '2026-05-21 13:28:29'),
(2, 'Physical Fitness Assessment', 'Semi-annual PFA will be conducted on May 15, 2026 at 0600H. All reservists must report to Camp Aguinaldo PT Field.', 'all', NULL, NULL, 6, 1, '2026-05-05', '2026-05-15', 1, '2026-05-05 08:00:00', '2026-05-21 13:28:29'),
(3, 'Medical Clearance Required', 'Reservists with pending medical evaluations must complete their assessments by April 30, 2026.', 'reservist', NULL, NULL, NULL, 1, '2026-04-01', '2026-04-30', 1, '2026-04-15 10:00:00', '2026-05-21 13:28:29'),
(4, 'Weapons Qualification Deadline', 'All reservists must complete their annual weapons qualification by June 30, 2026. Schedule with your unit armory.', 'reservist', 1, NULL, NULL, 1, '2026-05-01', '2026-06-30', 1, '2026-05-02 09:00:00', '2026-05-21 13:28:29'),
(5, 'COIN Training Deployment Notice', '1st Infantry Group units will participate in Counter-Insurgency Operations Workshop at Camp Panacan, Davao, Aug 10-14.', 'reservist', 1, NULL, 13, 1, '2026-07-01', '2026-08-09', 1, '2026-07-01 08:00:00', '2026-05-21 13:28:29');

-- --------------------------------------------------------

--
-- Table structure for table `announcements`
--

DROP TABLE IF EXISTS `announcements`;
CREATE TABLE IF NOT EXISTS `announcements` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('General','Training','Deployment','Administrative','Emergency') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'General',
  `priority` enum('critical','high','medium','low') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `author` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CO Admin',
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_priority` (`priority`),
  KEY `idx_status` (`status`),
  KEY `idx_created` (`created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `announcements`
--

INSERT INTO `announcements` (`id`, `title`, `type`, `priority`, `status`, `author`, `body`, `created_at`, `updated_at`) VALUES
('55a57777-a237-466c-b716-d966622d16bc', 'External Trainings - May 20, 2026', 'General', 'medium', 'active', 'CO Admin', '\n', '2026-05-21 16:45:14', '2026-05-21 16:45:14'),
('839de672-7bbb-4752-a667-14a4a011e138', 'Supply and Goods - July 1, 2026', 'General', 'medium', 'active', 'CO Admin', 'Supply and Goods', '2026-05-21 16:46:17', '2026-05-21 16:46:17'),
('89fe2f86-c54c-4656-8f3f-4a8bfa7c755f', 'Upcoming Events (Internal) - June 15, 2026', 'General', 'medium', 'active', 'CO Admin', 'Lorem', '2026-05-21 16:45:42', '2026-05-21 16:45:42'),
('be852427-4486-4584-8bab-5c91ba2fea74', 'Assembly Test', 'General', 'medium', 'active', 'CO Admin', 'lorem ipsum', '2026-05-21 16:44:49', '2026-05-21 16:44:49');

-- --------------------------------------------------------

--
-- Table structure for table `areas`
--

DROP TABLE IF EXISTS `areas`;
CREATE TABLE IF NOT EXISTS `areas` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `parent_area_id` bigint DEFAULT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `geographic_boundary` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_parent` (`parent_area_id`),
  KEY `idx_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `areas`
--

INSERT INTO `areas` (`id`, `parent_area_id`, `name`, `code`, `description`, `geographic_boundary`, `is_active`, `created_at`, `updated_at`) VALUES
(1, NULL, 'National Capital Region', 'NCR', 'Metro Manila area', NULL, 1, '2026-05-21 13:26:28', '2026-05-21 13:26:28'),
(2, NULL, 'Northern Luzon', 'NLU', 'Northern Luzon region', NULL, 1, '2026-05-21 13:26:28', '2026-05-21 13:26:28'),
(3, NULL, 'Southern Luzon', 'SLU', 'Southern Luzon region', NULL, 1, '2026-05-21 13:26:28', '2026-05-21 13:26:28'),
(4, NULL, 'Visayas', 'VIS', 'Visayas region', NULL, 1, '2026-05-21 13:26:28', '2026-05-21 13:26:28'),
(5, NULL, 'Mindanao', 'MIN', 'Mindanao region', NULL, 1, '2026-05-21 13:26:28', '2026-05-21 13:26:28'),
(6, 1, 'Manila', 'MNL', 'Manila proper', NULL, 1, '2026-05-21 13:26:28', '2026-05-21 13:26:28'),
(7, 1, 'Quezon City', 'QZN', 'Quezon City area', NULL, 1, '2026-05-21 13:26:28', '2026-05-21 13:26:28'),
(8, 1, 'Makati', 'MKT', 'Makati City area', NULL, 1, '2026-05-21 13:26:28', '2026-05-21 13:26:28'),
(9, 2, 'Cordillera Administrative Region', 'CAR', 'CAR area', NULL, 1, '2026-05-21 13:26:28', '2026-05-21 13:26:28'),
(10, 2, 'Ilocos Region', 'R01', 'Ilocos Region', NULL, 1, '2026-05-21 13:26:28', '2026-05-21 13:26:28'),
(11, 3, 'Calabarzon', 'R4A', 'Calabarzon region', NULL, 1, '2026-05-21 13:26:28', '2026-05-21 13:26:28'),
(12, 4, 'Western Visayas', 'R06', 'Western Visayas region', NULL, 1, '2026-05-21 13:26:28', '2026-05-21 13:26:28'),
(13, 5, 'Northern Mindanao', 'R10', 'Northern Mindanao region', NULL, 1, '2026-05-21 13:26:28', '2026-05-21 13:26:28');

-- --------------------------------------------------------

--
-- Table structure for table `arsens`
--

DROP TABLE IF EXISTS `arsens`;
CREATE TABLE IF NOT EXISTS `arsens` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `commander_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_code` (`code`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `arsens`
--

INSERT INTO `arsens` (`id`, `code`, `name`, `location`, `commander_name`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'HQ', 'PAFR Headquarters', 'Camp Aguinaldo, QC', 'BGen. Santos', 1, '2026-05-21 08:01:14', '2026-05-21 08:01:14'),
(2, '501st', '501st Brigade', 'Brigade Area North', 'Col. Reyes', 1, '2026-05-21 08:01:14', '2026-05-21 08:01:14'),
(3, '502nd', '502nd Brigade', 'Brigade Area South', 'Col. Cruz', 1, '2026-05-21 08:01:14', '2026-05-21 08:01:14');

-- --------------------------------------------------------

--
-- Table structure for table `attendance`
--

DROP TABLE IF EXISTS `attendance`;
CREATE TABLE IF NOT EXISTS `attendance` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `reservist_id` bigint NOT NULL,
  `training_id` bigint NOT NULL,
  `status` enum('present','absent','late','excused','pending') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `check_in_time` datetime DEFAULT NULL,
  `check_out_time` datetime DEFAULT NULL,
  `location_check_in` json DEFAULT NULL,
  `qr_code_used` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `recorded_by` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_reservist_training` (`reservist_id`,`training_id`),
  KEY `recorded_by` (`recorded_by`),
  KEY `idx_training_status` (`training_id`,`status`),
  KEY `idx_reservist` (`reservist_id`),
  KEY `idx_dates` (`created_at`),
  KEY `idx_attendance_training_reservist` (`training_id`,`reservist_id`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` bigint DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_entity` (`entity_type`,`entity_id`),
  KEY `idx_timestamp` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `external_trainings`
--

DROP TABLE IF EXISTS `external_trainings`;
CREATE TABLE IF NOT EXISTS `external_trainings` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `start_date` date NOT NULL,
  `start_time` time DEFAULT NULL,
  `venue` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('draft','open','closed','completed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `capacity` int DEFAULT NULL,
  `registration_fields` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `squadron_limits` json DEFAULT NULL COMMENT 'Per-squadron slot limits (array of {squadron_id, slot_limit})',
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_start_date` (`start_date`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `external_trainings`
--

INSERT INTO `external_trainings` (`id`, `title`, `description`, `start_date`, `start_time`, `venue`, `status`, `capacity`, `registration_fields`, `created_at`, `updated_at`, `squadron_limits`) VALUES
(1, 'AFP Reserve Summit 2026', 'National gathering of reserve forces — policy updates, interoperability, and next-year training cycles.', '2026-09-20', '08:00:00', 'AFP Conference Center, Camp Gen. Aguinaldo', 'open', 200, NULL, '2026-05-21 08:02:08', '2026-05-21 08:02:08', '[{\"slot_limit\": 30, \"squadron_id\": 1}, {\"slot_limit\": 30, \"squadron_id\": 2}, {\"slot_limit\": 30, \"squadron_id\": 3}]'),
(2, 'Disaster Response Simulation', 'Multi-agency earthquake and flood-response simulation exercise hosted by the Office of Civil Defence.', '2026-10-15', '07:00:00', 'QC Disaster Drill Zone', 'open', 150, NULL, '2026-05-21 08:02:08', '2026-05-21 08:02:08', '[{\"slot_limit\": 25, \"squadron_id\": 1}, {\"slot_limit\": 25, \"squadron_id\": 2}]');

-- --------------------------------------------------------

--
-- Table structure for table `external_training_attachments`
--

DROP TABLE IF EXISTS `external_training_attachments`;
CREATE TABLE IF NOT EXISTS `external_training_attachments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `external_training_id` bigint NOT NULL,
  `kind` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'letter_order',
  `stored_filename` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_filename` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size_bytes` int DEFAULT NULL,
  `storage_backend` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'local',
  `relative_path` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_by` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `uploaded_by` (`uploaded_by`),
  KEY `idx_external_training_kind` (`external_training_id`,`kind`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `groups`
--

DROP TABLE IF EXISTS `groups`;
CREATE TABLE IF NOT EXISTS `groups` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `arsen_id` bigint NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `commander_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_group_code` (`arsen_id`,`code`),
  KEY `idx_arsen` (`arsen_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `groups`
--

INSERT INTO `groups` (`id`, `arsen_id`, `code`, `name`, `commander_name`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 'G1', 'Alpha Group', 'Maj. Garcia', 1, '2026-05-21 08:01:14', '2026-05-21 08:01:14'),
(2, 1, 'G2', 'Bravo Group', 'Maj. Mendoza', 1, '2026-05-21 08:01:14', '2026-05-21 08:01:14'),
(3, 2, 'G3', 'Charlie Group', 'Maj. Torres', 1, '2026-05-21 08:01:14', '2026-05-21 08:01:14');

-- --------------------------------------------------------

--
-- Table structure for table `internal_training_attachments`
--

DROP TABLE IF EXISTS `internal_training_attachments`;
CREATE TABLE IF NOT EXISTS `internal_training_attachments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `training_id` bigint NOT NULL,
  `kind` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'letter_order',
  `stored_filename` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_filename` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size_bytes` int DEFAULT NULL,
  `storage_backend` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'local',
  `relative_path` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_by` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `uploaded_by` (`uploaded_by`),
  KEY `idx_training_kind` (`training_id`,`kind`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `internal_training_participants`
--

DROP TABLE IF EXISTS `internal_training_participants`;
CREATE TABLE IF NOT EXISTS `internal_training_participants` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `training_id` bigint NOT NULL,
  `reservist_id` bigint NOT NULL,
  `squadron_id` bigint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_training_reservist` (`training_id`,`reservist_id`),
  KEY `reservist_id` (`reservist_id`),
  KEY `idx_training` (`training_id`),
  KEY `idx_squadron` (`squadron_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `readiness`
--

DROP TABLE IF EXISTS `readiness`;
CREATE TABLE IF NOT EXISTS `readiness` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `reservist_id` bigint NOT NULL,
  `assessment_date` date NOT NULL,
  `medical_status` enum('fit','unfit','limited','pending') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `medical_notes` text COLLATE utf8mb4_unicode_ci,
  `physical_score` decimal(5,2) NOT NULL,
  `physical_test_date` date DEFAULT NULL,
  `weapons_qualification` enum('expert','sharpshooter','marksman','qualified','unqualified','none') COLLATE utf8mb4_unicode_ci DEFAULT 'none',
  `weapons_test_date` date DEFAULT NULL,
  `overall_score` decimal(5,2) GENERATED ALWAYS AS (round(((((case when (`medical_status` = _utf8mb4'fit') then 100 when (`medical_status` = _utf8mb4'limited') then 70 when (`medical_status` = _utf8mb4'pending') then 50 else 0 end) + `physical_score`) + (case `weapons_qualification` when _utf8mb4'expert' then 100 when _utf8mb4'sharpshooter' then 90 when _utf8mb4'marksman' then 80 when _utf8mb4'qualified' then 70 else 0 end)) / 3),2)) STORED,
  `assessed_by` bigint DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_reservist_date` (`reservist_id`,`assessment_date`),
  KEY `assessed_by` (`assessed_by`),
  KEY `idx_reservist` (`reservist_id`),
  KEY `idx_assessment_date` (`assessment_date`),
  KEY `idx_overall_score` (`overall_score`),
  KEY `idx_readiness_reservist_date` (`reservist_id`,`assessment_date` DESC)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

DROP TABLE IF EXISTS `reports`;
CREATE TABLE IF NOT EXISTS `reports` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_type` enum('internal','external') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'internal',
  `event_source_id` bigint DEFAULT NULL COMMENT 'FK to trainings.id or external_trainings.id',
  `event_date` date DEFAULT NULL,
  `summary` text COLLATE utf8mb4_unicode_ci,
  `type` enum('attendance','readiness','logistics','custom') COLLATE utf8mb4_unicode_ci NOT NULL,
  `format` enum('pdf','excel','csv') COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int DEFAULT NULL,
  `parameters` json DEFAULT NULL,
  `generated_by` bigint NOT NULL,
  `generated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime DEFAULT NULL,
  `is_recurring` tinyint(1) DEFAULT '0',
  `schedule_pattern` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_event_type` (`event_type`),
  KEY `idx_generated_at` (`generated_at`),
  KEY `idx_generated_by` (`generated_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `report_documentations`
--

DROP TABLE IF EXISTS `report_documentations`;
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

-- --------------------------------------------------------

--
-- Table structure for table `report_participants`
--

DROP TABLE IF EXISTS `report_participants`;
CREATE TABLE IF NOT EXISTS `report_participants` (
  `report_id` bigint NOT NULL,
  `reservist_id` bigint NOT NULL,
  `squadron_id` bigint DEFAULT NULL,
  `attendance_status` enum('present','absent','late','excused') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'present',
  `notes` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`report_id`,`reservist_id`),
  KEY `idx_rp_report` (`report_id`),
  KEY `idx_rp_reservist` (`reservist_id`),
  KEY `idx_rp_squadron` (`squadron_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reservists`
--

DROP TABLE IF EXISTS `reservists`;
CREATE TABLE IF NOT EXISTS `reservists` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rank` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `service_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `place_of_birth` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `age` int DEFAULT NULL,
  `sex` enum('Male','Female','Other') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `civil_status` enum('Single','Married','Widowed','Separated','Divorced') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `citizenship` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Filipino',
  `height` decimal(5,2) DEFAULT NULL,
  `weight` decimal(5,2) DEFAULT NULL,
  `blood_type` enum('A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown') COLLATE utf8mb4_unicode_ci DEFAULT 'Unknown',
  `phone_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `reserve_center` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` enum('1st Category','2nd Category','3rd Category') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_enlisted` date DEFAULT NULL,
  `source_of_commission` enum('ROTC','BCMT','MOTC','Direct Commission') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rank_date_appointment` date DEFAULT NULL,
  `position` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `specialization` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reserve_status` enum('Ready Reserve','Standby Reserve','Retired') COLLATE utf8mb4_unicode_ci DEFAULT 'Ready Reserve',
  `highest_education` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `course_degree` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `school` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `year_graduated` int DEFAULT NULL,
  `occupation` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employer` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `office_address` text COLLATE utf8mb4_unicode_ci,
  `basic_training_completed` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `basic_training_date` date DEFAULT NULL,
  `emergency_contact_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact_address` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `service_number` (`service_number`),
  KEY `idx_service_number` (`service_number`),
  KEY `idx_name` (`last_name`,`first_name`),
  KEY `idx_active` (`is_active`),
  KEY `idx_rank` (`rank`),
  KEY `idx_position` (`position`),
  KEY `idx_reserve_status` (`reserve_status`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `reservists`
--

INSERT INTO `reservists` (`id`, `user_id`, `first_name`, `last_name`, `rank`, `service_number`, `date_of_birth`, `place_of_birth`, `age`, `sex`, `civil_status`, `citizenship`, `height`, `weight`, `blood_type`, `phone_number`, `address`, `reserve_center`, `category`, `date_enlisted`, `source_of_commission`, `rank_date_appointment`, `position`, `specialization`, `reserve_status`, `highest_education`, `course_degree`, `school`, `year_graduated`, `occupation`, `employer`, `office_address`, `basic_training_completed`, `basic_training_date`, `emergency_contact_name`, `emergency_contact_phone`, `emergency_contact_address`, `is_active`, `created_at`, `updated_at`) VALUES
(2, 3, 'Juan', 'Dela Cruz', 'Sergeant', 'SN-00001', NULL, NULL, NULL, 'Male', NULL, 'Filipino', NULL, NULL, 'Unknown', NULL, NULL, NULL, NULL, '2020-01-15', NULL, NULL, NULL, NULL, 'Ready Reserve', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-05-21 08:02:08', '2026-05-21 08:02:08'),
(3, 4, 'Maria', 'Santos', 'Corporal', 'SN-00002', NULL, NULL, NULL, 'Female', NULL, 'Filipino', NULL, NULL, 'Unknown', NULL, NULL, NULL, NULL, '2021-03-22', NULL, NULL, NULL, NULL, 'Ready Reserve', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-05-21 08:02:08', '2026-05-21 08:02:08'),
(4, 5, 'Pedro', 'Reyes', 'Lieutenant', 'SN-00003', NULL, NULL, NULL, 'Male', NULL, 'Filipino', NULL, NULL, 'Unknown', NULL, NULL, NULL, NULL, '2019-07-10', NULL, NULL, NULL, NULL, 'Standby Reserve', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-05-21 08:02:08', '2026-05-21 08:02:08');

-- --------------------------------------------------------

--
-- Table structure for table `reservist_assignments`
--

DROP TABLE IF EXISTS `reservist_assignments`;
CREATE TABLE IF NOT EXISTS `reservist_assignments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `reservist_id` bigint NOT NULL,
  `group_id` bigint NOT NULL,
  `squadron_id` bigint NOT NULL,
  `assigned_date` date NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '1',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `squadron_id` (`squadron_id`),
  KEY `idx_group_squadron` (`group_id`,`squadron_id`),
  KEY `idx_reservist` (`reservist_id`),
  KEY `idx_reservist_active_assignments` (`reservist_id`,`is_primary`,`group_id`,`squadron_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `reservist_assignments`
--

INSERT INTO `reservist_assignments` (`id`, `reservist_id`, `group_id`, `squadron_id`, `assigned_date`, `is_primary`, `notes`, `created_at`, `updated_at`) VALUES
(1, 2, 1, 1, '2023-01-01', 1, NULL, '2026-05-21 08:02:08', '2026-05-21 08:02:08'),
(2, 3, 1, 1, '2023-02-01', 0, NULL, '2026-05-21 08:02:08', '2026-05-21 08:02:08'),
(3, 4, 2, 3, '2023-03-01', 1, NULL, '2026-05-21 08:02:08', '2026-05-21 08:02:08'),
(4, 2, 1, 1, '2023-01-01', 1, NULL, '2026-05-21 08:02:56', '2026-05-21 08:02:56'),
(5, 3, 1, 1, '2023-02-01', 0, NULL, '2026-05-21 08:02:56', '2026-05-21 08:02:56'),
(6, 4, 2, 3, '2023-03-01', 1, NULL, '2026-05-21 08:02:56', '2026-05-21 08:02:56');

-- --------------------------------------------------------

--
-- Table structure for table `squadron`
--

DROP TABLE IF EXISTS `squadron`;
CREATE TABLE IF NOT EXISTS `squadron` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `group_id` bigint NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `specialization` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_group` (`group_id`),
  KEY `idx_location` (`location`),
  KEY `idx_specialization` (`specialization`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `squadron`
--

INSERT INTO `squadron` (`id`, `group_id`, `name`, `code`, `location`, `specialization`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 'Squadron 101', 'SQ-101', 'North Post', 'Infantry', 1, '2026-05-21 08:01:14', '2026-05-21 08:01:14'),
(2, 1, 'Squadron 102', 'SQ-102', 'East Post', 'Recon', 1, '2026-05-21 08:01:14', '2026-05-21 08:01:14'),
(3, 2, 'Squadron 201', 'SQ-201', 'West Post', 'Medical', 1, '2026-05-21 08:01:14', '2026-05-21 08:01:14'),
(4, 2, 'Squadron 202', 'SQ-202', 'South Post', 'Engineering', 1, '2026-05-21 08:01:14', '2026-05-21 08:01:14'),
(5, 3, 'Squadron 301', 'SQ-301', 'Central Post', 'Logistics', 1, '2026-05-21 08:01:14', '2026-05-21 08:01:14'),
(6, 1, 'Squadron 101', 'SQ-101', 'North Post', 'Infantry', 1, '2026-05-21 08:02:08', '2026-05-21 08:02:08'),
(7, 1, 'Squadron 102', 'SQ-102', 'East Post', 'Recon', 1, '2026-05-21 08:02:08', '2026-05-21 08:02:08'),
(8, 2, 'Squadron 201', 'SQ-201', 'West Post', 'Medical', 1, '2026-05-21 08:02:08', '2026-05-21 08:02:08'),
(9, 2, 'Squadron 202', 'SQ-202', 'South Post', 'Engineering', 1, '2026-05-21 08:02:08', '2026-05-21 08:02:08'),
(10, 3, 'Squadron 301', 'SQ-301', 'Central Post', 'Logistics', 1, '2026-05-21 08:02:08', '2026-05-21 08:02:08'),
(11, 1, 'Squadron 101', 'SQ-101', 'North Post', 'Infantry', 1, '2026-05-21 08:02:56', '2026-05-21 08:02:56'),
(12, 1, 'Squadron 102', 'SQ-102', 'East Post', 'Recon', 1, '2026-05-21 08:02:56', '2026-05-21 08:02:56'),
(13, 2, 'Squadron 201', 'SQ-201', 'West Post', 'Medical', 1, '2026-05-21 08:02:56', '2026-05-21 08:02:56'),
(14, 2, 'Squadron 202', 'SQ-202', 'South Post', 'Engineering', 1, '2026-05-21 08:02:56', '2026-05-21 08:02:56'),
(15, 3, 'Squadron 301', 'SQ-301', 'Central Post', 'Logistics', 1, '2026-05-21 08:02:56', '2026-05-21 08:02:56');

-- --------------------------------------------------------

--
-- Table structure for table `supplies`
--

DROP TABLE IF EXISTS `supplies`;
CREATE TABLE IF NOT EXISTS `supplies` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_available` int NOT NULL DEFAULT '0',
  `reorder_level` int NOT NULL DEFAULT '10',
  `max_stock` int DEFAULT NULL,
  `location` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplier` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_ordered_date` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `supplies`
--

INSERT INTO `supplies` (`id`, `name`, `category`, `description`, `unit`, `quantity_available`, `reorder_level`, `max_stock`, `location`, `supplier`, `last_ordered_date`, `created_at`, `updated_at`) VALUES
(1, 'M16A4 Rifle', 'Weapons', '5.56mm NATO assault rifle', 'pcs', 150, 50, 300, 'Armory Room A', 'FN Herstal', '2026-03-15', '2025-01-10 08:00:00', '2026-05-21 13:28:29'),
(2, 'M4 Carbine', 'Weapons', '5.56mm NATO carbine', 'pcs', 85, 30, 150, 'Armory Room B', 'Colt Defense', '2026-02-20', '2025-01-10 08:00:00', '2026-05-21 13:28:29'),
(3, '9mm Pistol Magazine', 'Ammunition', 'Standard 9mm pistol magazine (17rd)', 'pcs', 500, 100, 1000, 'Ammo Storage B', 'IMI', '2026-03-01', '2025-01-15 09:00:00', '2026-05-21 13:28:29'),
(4, '5.56mm NATO Ammo', 'Ammunition', '5.56x45mm NATO ball ammunition', 'rounds', 15000, 5000, 30000, 'Ammo Storage A', 'Lake City Army', '2026-01-10', '2025-01-15 09:00:00', '2026-05-21 13:28:29'),
(5, 'Combat Uniform (OCP)', 'Uniforms', 'Operational Camouflage Pattern uniform set', 'sets', 200, 50, 500, 'Supply Room 1', 'Propper', '2026-02-15', '2025-02-01 10:00:00', '2026-05-21 13:28:29'),
(6, 'Combat Boots', 'Uniforms', 'Temperate/hot weather combat boots', 'pairs', 180, 40, 400, 'Supply Room 2', 'Wolverine', '2026-01-25', '2025-02-01 10:00:00', '2026-05-21 13:28:29'),
(7, 'Kevlar Helmet', 'Protective Equipment', 'PASGT ballistic helmet', 'pcs', 120, 30, 250, 'Supply Room 3', 'Gentex', '2026-03-05', '2025-02-10 11:00:00', '2026-05-21 13:28:29'),
(8, 'Body Armor Plate', 'Protective Equipment', 'ESAPI Level IV ballistic plate', 'pcs', 95, 25, 200, 'Supply Room 3', 'Ceradyne', '2026-02-10', '2025-02-10 11:00:00', '2026-05-21 13:28:29'),
(9, 'Tactical Radio (PRC-152)', 'Communications', 'Multiband handheld tactical radio', 'pcs', 30, 10, 60, 'Comms Vault', 'Motorola', '2026-01-30', '2025-03-01 09:00:00', '2026-05-21 13:28:29'),
(10, 'First Aid Kit (IFAK)', 'Medical', 'Individual first aid kit', 'kits', 200, 50, 400, 'Medical Storage', 'North American Rescue', '2026-03-20', '2025-03-01 09:00:00', '2026-05-21 13:28:29'),
(11, 'Entrenching Tool', 'Field Equipment', 'Folding military e-tool', 'pcs', 100, 25, 200, 'Supply Room 4', 'Glock', '2026-02-05', '2025-03-05 10:00:00', '2026-05-21 13:28:29'),
(12, 'MRE (Meal Ready to Eat)', 'Rations', 'Complete field ration meal', 'meals', 1000, 200, 3000, 'Ration Storage', 'Ameriqual', '2026-03-10', '2025-03-10 08:00:00', '2026-05-21 13:28:29'),
(13, 'Night Vision Goggle', 'Optics', 'PVS-14 monocular night vision device', 'pcs', 20, 5, 40, 'Optics Vault', 'L3Harris', '2026-01-15', '2025-03-15 11:00:00', '2026-05-21 13:28:29'),
(14, 'Laser Bore Sighter', 'Training Aids', 'Laser cartridge for zeroing weapons', 'pcs', 45, 10, 100, 'Armory Room C', 'Laser Devices', '2026-03-25', '2025-04-01 09:00:00', '2026-05-21 13:28:29'),
(15, 'Vehicle Fuel (Diesel)', 'Logistics', 'Military grade diesel fuel', 'liters', 5000, 1000, 10000, 'Fuel Depot', 'Petron', '2026-04-01', '2025-04-01 08:00:00', '2026-05-21 13:28:29');

-- --------------------------------------------------------

--
-- Table structure for table `supply_issuances`
--

DROP TABLE IF EXISTS `supply_issuances`;
CREATE TABLE IF NOT EXISTS `supply_issuances` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `reservist_id` bigint NOT NULL,
  `supply_id` bigint NOT NULL,
  `quantity_issued` int NOT NULL,
  `issued_date` date NOT NULL DEFAULT (curdate()),
  `due_return_date` date NOT NULL,
  `returned_date` date DEFAULT NULL,
  `returned_quantity` int DEFAULT NULL,
  `condition_on_issue` enum('new','good','fair','poor') COLLATE utf8mb4_unicode_ci DEFAULT 'good',
  `condition_on_return` enum('new','good','fair','poor','damaged') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `issued_by` bigint NOT NULL,
  `received_by` bigint DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `issued_by` (`issued_by`),
  KEY `received_by` (`received_by`),
  KEY `idx_reservist` (`reservist_id`),
  KEY `idx_supply` (`supply_id`),
  KEY `idx_due_date` (`due_return_date`),
  KEY `idx_issuances_reservist_due` (`reservist_id`,`returned_date`,`due_return_date`)
) ;

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE IF NOT EXISTS `system_settings` (
  `key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` json NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `updated_by` bigint DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`),
  KEY `updated_by` (`updated_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `system_settings`
--

INSERT INTO `system_settings` (`key`, `value`, `description`, `updated_by`, `updated_at`) VALUES
('app_name', '\"PAFR - Personnel & Attendance Force Readiness\"', 'Application name', 1, '2025-01-01 00:00:00'),
('app_version', '\"1.0.0\"', 'Application version', 1, '2025-01-01 00:00:00'),
('attendance_checkin_window_minutes', '15', 'Minutes before/after training start for check-in', 1, '2025-01-15 08:00:00'),
('attendance_qr_enabled', 'true', 'Enable QR code attendance scanning', 1, '2025-01-15 08:00:00'),
('auto_logout_timeout_minutes', '30', 'Auto-logout after inactivity', 1, '2025-02-01 09:00:00'),
('low_stock_threshold', '10', 'Alert when supplies drop below this level', 1, '2025-03-01 10:00:00'),
('max_login_attempts', '5', 'Max failed login attempts before lockout', 1, '2025-02-01 09:00:00'),
('notification_email_enabled', 'false', 'Enable email notifications', 1, '2025-03-15 11:00:00'),
('password_min_length', '8', 'Minimum password length', 1, '2025-02-01 09:00:00'),
('readiness_threshold', '70', 'Minimum overall readiness score threshold', 1, '2025-03-01 10:00:00'),
('report_retention_days', '365', 'Number of days to retain generated reports', 1, '2025-04-01 08:00:00'),
('session_timeout_minutes', '480', 'Session timeout in minutes (8 hours)', 1, '2025-02-01 09:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `trainings`
--

DROP TABLE IF EXISTS `trainings`;
CREATE TABLE IF NOT EXISTS `trainings` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `start_datetime` datetime NOT NULL,
  `end_datetime` datetime NOT NULL,
  `venue` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `area_id` bigint DEFAULT NULL,
  `status` enum('draft','published','ongoing','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `capacity` int DEFAULT NULL,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` bigint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `idx_status` (`status`),
  KEY `idx_dates` (`start_datetime`,`end_datetime`),
  KEY `idx_area` (`area_id`),
  KEY `idx_trainings_dates_status` (`start_datetime`,`status`)
) ;

--
-- Dumping data for table `trainings`
--

INSERT INTO `trainings` (`id`, `title`, `description`, `start_datetime`, `end_datetime`, `venue`, `area_id`, `status`, `capacity`, `is_mandatory`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'PAFR Annual Field Exercises 2026', 'Three-day brigade-level field exercise covering jungle navigation, live-fire drills, and casualty evacuation.', '2026-06-15 06:00:00', '2026-06-17 18:00:00', 'Brigade Training Grounds, North', NULL, 'published', NULL, 0, 1, '2026-05-21 08:02:08', '2026-05-21 08:02:08'),
(2, 'Combat First Aid Refresher', 'Hands-on TCCC / SABC refresher — tourniquets, haemostatic agents, and casualty movement.', '2026-05-28 08:00:00', '2026-05-28 17:00:00', 'Medical Hangar, Central Post', NULL, 'published', NULL, 0, 1, '2026-05-21 08:02:08', '2026-05-21 08:02:08'),
(3, 'Signal & Communications Drill', 'Radio procedure, encrypted net-control, and site-recovery exercises for signal officers.', '2026-06-05 07:00:00', '2026-06-05 16:00:00', 'Comms Center, HQ Building', NULL, 'published', NULL, 0, 1, '2026-05-21 08:02:08', '2026-05-21 08:02:08'),
(4, 'Weapons Qualification — M4/M16', 'Annual weapons qual: zeroing, Table 1 (known distance), and Table 2 (field-fire) on the 800 m range.', '2026-07-01 06:30:00', '2026-07-03 15:00:00', 'PAFR Firing Range, South', NULL, 'published', NULL, 0, 1, '2026-05-21 08:02:08', '2026-05-21 08:02:08'),
(5, 'Command Post Staff Exercise', 'Simulated C2 exercise replicating battalion-level operations during contingency response.', '2026-08-10 08:00:00', '2026-08-12 17:00:00', 'HQ Conference Hall, Camp Aguinaldo', NULL, 'published', NULL, 0, 1, '2026-05-21 08:02:08', '2026-05-21 08:02:08');

-- --------------------------------------------------------

--
-- Table structure for table `training_registrations`
--

DROP TABLE IF EXISTS `training_registrations`;
CREATE TABLE IF NOT EXISTS `training_registrations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `training_id` bigint NOT NULL,
  `participant_data` json DEFAULT NULL,
  `registered_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_training` (`training_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','reservist') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'reservist',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email` (`email`),
  KEY `idx_role` (`role`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password_hash`, `role`, `is_active`, `last_login_at`, `created_at`, `updated_at`) VALUES
(1, 'admin@pafr.mil', '$2a$10$yourhashhere_admin123', 'admin', 1, NULL, '2026-05-21 08:01:14', '2026-05-21 08:01:14'),
(3, 'spvt1@pafr.mil', 'reservist_pass', 'reservist', 1, NULL, '2026-05-21 08:01:14', '2026-05-21 08:01:14'),
(4, 'spvt2@pafr.mil', 'reservist_pass', 'reservist', 1, NULL, '2026-05-21 08:01:14', '2026-05-21 08:01:14'),
(5, 'spvt3@pafr.mil', 'reservist_pass', 'reservist', 1, NULL, '2026-05-21 08:01:14', '2026-05-21 08:01:14');

-- --------------------------------------------------------

--
-- Table structure for table `user_alerts`
--

DROP TABLE IF EXISTS `user_alerts`;
CREATE TABLE IF NOT EXISTS `user_alerts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `alert_id` bigint NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_alert` (`user_id`,`alert_id`),
  KEY `alert_id` (`alert_id`),
  KEY `idx_unread` (`user_id`,`is_read`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activities`
--
ALTER TABLE `activities`
  ADD CONSTRAINT `activities_ibfk_1` FOREIGN KEY (`training_id`) REFERENCES `trainings` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `alerts`
--
ALTER TABLE `alerts`
  ADD CONSTRAINT `alerts_ibfk_1` FOREIGN KEY (`target_group_id`) REFERENCES `groups` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `alerts_ibfk_2` FOREIGN KEY (`target_squadron_id`) REFERENCES `squadron` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `alerts_ibfk_3` FOREIGN KEY (`target_area_id`) REFERENCES `areas` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `alerts_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `areas`
--
ALTER TABLE `areas`
  ADD CONSTRAINT `areas_ibfk_1` FOREIGN KEY (`parent_area_id`) REFERENCES `areas` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `attendance`
--
ALTER TABLE `attendance`
  ADD CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`reservist_id`) REFERENCES `reservists` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `attendance_ibfk_2` FOREIGN KEY (`training_id`) REFERENCES `trainings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `attendance_ibfk_3` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `external_training_attachments`
--
ALTER TABLE `external_training_attachments`
  ADD CONSTRAINT `external_training_attachments_ibfk_1` FOREIGN KEY (`external_training_id`) REFERENCES `external_trainings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `external_training_attachments_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `groups`
--
ALTER TABLE `groups`
  ADD CONSTRAINT `groups_ibfk_1` FOREIGN KEY (`arsen_id`) REFERENCES `arsens` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `internal_training_attachments`
--
ALTER TABLE `internal_training_attachments`
  ADD CONSTRAINT `internal_training_attachments_ibfk_1` FOREIGN KEY (`training_id`) REFERENCES `trainings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `internal_training_attachments_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `internal_training_participants`
--
ALTER TABLE `internal_training_participants`
  ADD CONSTRAINT `internal_training_participants_ibfk_1` FOREIGN KEY (`training_id`) REFERENCES `trainings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `internal_training_participants_ibfk_2` FOREIGN KEY (`reservist_id`) REFERENCES `reservists` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `internal_training_participants_ibfk_3` FOREIGN KEY (`squadron_id`) REFERENCES `squadron` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `readiness`
--
ALTER TABLE `readiness`
  ADD CONSTRAINT `readiness_ibfk_1` FOREIGN KEY (`reservist_id`) REFERENCES `reservists` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `readiness_ibfk_2` FOREIGN KEY (`assessed_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `reports`
--
ALTER TABLE `reports`
  ADD CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`generated_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `reservists`
--
ALTER TABLE `reservists`
  ADD CONSTRAINT `reservists_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reservist_assignments`
--
ALTER TABLE `reservist_assignments`
  ADD CONSTRAINT `reservist_assignments_ibfk_1` FOREIGN KEY (`reservist_id`) REFERENCES `reservists` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reservist_assignments_ibfk_2` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reservist_assignments_ibfk_3` FOREIGN KEY (`squadron_id`) REFERENCES `squadron` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `squadron`
--
ALTER TABLE `squadron`
  ADD CONSTRAINT `squadron_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `supply_issuances`
--
ALTER TABLE `supply_issuances`
  ADD CONSTRAINT `supply_issuances_ibfk_1` FOREIGN KEY (`reservist_id`) REFERENCES `reservists` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `supply_issuances_ibfk_2` FOREIGN KEY (`supply_id`) REFERENCES `supplies` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `supply_issuances_ibfk_3` FOREIGN KEY (`issued_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `supply_issuances_ibfk_4` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD CONSTRAINT `system_settings_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `trainings`
--
ALTER TABLE `trainings`
  ADD CONSTRAINT `trainings_ibfk_1` FOREIGN KEY (`area_id`) REFERENCES `areas` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `trainings_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `training_registrations`
--
ALTER TABLE `training_registrations`
  ADD CONSTRAINT `training_registrations_ibfk_1` FOREIGN KEY (`training_id`) REFERENCES `external_trainings` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_alerts`
--
ALTER TABLE `user_alerts`
  ADD CONSTRAINT `user_alerts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_alerts_ibfk_2` FOREIGN KEY (`alert_id`) REFERENCES `alerts` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

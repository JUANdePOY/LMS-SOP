-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: May 21, 2026 at 06:26 AM
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
('ann-001', 'Monthly Readiness Report', 'General', 'high', 'active', 'CO Admin', 'All units must submit readiness scores by end of week.', '2025-05-01 08:00:00', '2025-05-01 08:00:00'),
('ann-002', 'Training Schedule Update', 'Training', 'medium', 'active', 'Training Officer', 'Training schedule for Q2 has been updated. Please review.', '2025-05-03 10:30:00', '2025-05-03 10:30:00'),
('ann-003', 'Deployment Notice - Surigao', 'Deployment', 'critical', 'active', 'Operations', 'Deployment orders for Surigao detachment issued.', '2025-05-05 14:00:00', '2025-05-05 14:00:00'),
('ann-004', 'Leave Policy Reminder', 'Administrative', 'low', 'inactive', 'HR Division', 'Reminder: leave requests must be submitted 14 days in advance.', '2025-04-28 09:00:00', '2025-04-28 09:00:00'),
('ann-005', 'Emergency Drill - May 15', 'Emergency', 'critical', 'active', 'CO Admin', 'All personnel must participate in the emergency drill on May 15.', '2025-05-08 16:00:00', '2025-05-08 16:00:00'),
('ann-006', 'New Equipment Distribution', 'Administrative', 'medium', 'inactive', 'Logistics', 'Distribution of new communication equipment begins next week.', '2025-05-02 11:00:00', '2025-05-02 11:00:00');
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

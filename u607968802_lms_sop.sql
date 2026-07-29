-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Jul 28, 2026 at 01:01 PM
-- Server version: 11.8.8-MariaDB-log
-- PHP Version: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u607968802_lms_sop`
--

-- --------------------------------------------------------

--
-- Table structure for table `acknowledgement_history`
--

CREATE TABLE `acknowledgement_history` (
  `id` int(11) NOT NULL,
  `acknowledgement_id` int(11) NOT NULL,
  `previous_status` enum('Pending','Acknowledged','Reopened','Expired') DEFAULT NULL,
  `new_status` enum('Pending','Acknowledged','Reopened','Expired') NOT NULL,
  `changed_by` int(11) DEFAULT NULL,
  `changed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `remarks` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `activities`
--

CREATE TABLE `activities` (
  `id` int(11) NOT NULL,
  `training_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `activity_type` enum('quiz','assignment','discussion','survey') NOT NULL DEFAULT 'quiz',
  `status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
  `due_date` datetime DEFAULT NULL,
  `max_score` decimal(10,2) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `announcements`
--

CREATE TABLE `announcements` (
  `id` varchar(36) NOT NULL DEFAULT uuid(),
  `title` varchar(255) NOT NULL,
  `type` enum('General','Training','Deployment','Administrative','Emergency') NOT NULL DEFAULT 'General',
  `priority` enum('critical','high','medium','low') NOT NULL DEFAULT 'medium',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `author` varchar(100) NOT NULL DEFAULT 'CO Admin',
  `body` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `approval_workflows`
--

CREATE TABLE `approval_workflows` (
  `id` int(11) NOT NULL,
  `public_id` char(36) NOT NULL DEFAULT uuid(),
  `name` varchar(150) NOT NULL,
  `department_id` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `arsens`
--

CREATE TABLE `arsens` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `assignments`
--

CREATE TABLE `assignments` (
  `id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `module_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `due_date` datetime DEFAULT NULL,
  `max_score` int(11) NOT NULL DEFAULT 100,
  `submission_type` enum('file','text','both') NOT NULL DEFAULT 'text',
  `allow_late_submission` tinyint(1) NOT NULL DEFAULT 1,
  `late_penalty` decimal(5,2) DEFAULT NULL,
  `status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `assignment_departments`
--

CREATE TABLE `assignment_departments` (
  `id` int(11) NOT NULL,
  `assignment_id` int(11) NOT NULL,
  `department_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `assignment_positions`
--

CREATE TABLE `assignment_positions` (
  `id` int(11) NOT NULL,
  `assignment_id` int(11) NOT NULL,
  `position_name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `assignment_users`
--

CREATE TABLE `assignment_users` (
  `id` int(11) NOT NULL,
  `assignment_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance`
--

CREATE TABLE `attendance` (
  `id` int(11) NOT NULL,
  `training_id` int(11) NOT NULL,
  `reservist_id` int(11) NOT NULL,
  `status` enum('present','absent','late','excused') NOT NULL DEFAULT 'absent',
  `attended_at` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(100) NOT NULL,
  `entity_id` varchar(100) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `user_id`, `action`, `entity_type`, `entity_id`, `metadata`, `ip_address`, `user_agent`, `created_at`) VALUES
(1, 1, 'user.login', 'user', '1', NULL, NULL, NULL, '2026-07-24 02:15:06'),
(2, 1, 'user.updated', 'user', '1', NULL, NULL, NULL, '2026-07-24 02:59:53'),
(3, 1, 'user.login', 'user', '1', NULL, NULL, NULL, '2026-07-24 03:39:15'),
(4, 1, 'user.login', 'user', '1', NULL, NULL, NULL, '2026-07-24 03:40:18'),
(5, 1, 'user.login', 'user', '1', NULL, NULL, NULL, '2026-07-24 03:49:37'),
(6, 1, 'user.login', 'user', '1', NULL, NULL, NULL, '2026-07-24 04:18:36'),
(7, 1, 'user.login', 'user', '1', NULL, NULL, NULL, '2026-07-24 05:05:03'),
(8, 1, 'user.login', 'user', '1', NULL, NULL, NULL, '2026-07-24 05:47:11'),
(9, 1, 'user.login', 'user', '1', NULL, NULL, NULL, '2026-07-24 05:54:55'),
(10, 1, 'user.login', 'user', '1', NULL, NULL, NULL, '2026-07-24 06:08:40'),
(11, 1, 'user.updated', 'user', '1', NULL, NULL, NULL, '2026-07-24 06:23:54'),
(12, 1, 'user.login', 'user', '1', NULL, NULL, NULL, '2026-07-24 06:26:37'),
(13, 1, 'user.created', 'user', '17', NULL, NULL, NULL, '2026-07-24 06:29:00'),
(14, 1, 'user.login', 'user', '1', NULL, NULL, NULL, '2026-07-25 08:28:27'),
(15, 1, 'user.login', 'user', '1', NULL, NULL, NULL, '2026-07-25 09:08:19'),
(16, 1, 'user.login', 'user', '1', NULL, NULL, NULL, '2026-07-25 09:17:38'),
(17, 1, 'user.login', 'user', '1', NULL, NULL, NULL, '2026-07-25 09:24:33'),
(18, 1, 'sop.created', 'sop', '1', '{\"title\":\"TEST\",\"code\":\"SOP-2677-TES\",\"status\":\"Draft\"}', NULL, NULL, '2026-07-25 14:22:33'),
(19, 1, 'sop.section.created', 'sop_section', '1', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-25 16:29:58'),
(20, 1, 'sop.section.created', 'sop_section', '2', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-25 16:29:58'),
(21, 1, 'sop.section.created', 'sop_section', '3', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-25 16:29:59'),
(22, 1, 'sop.section.created', 'sop_section', '4', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-25 16:30:03'),
(23, 1, 'sop.section.created', 'sop_section', '5', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-25 16:30:04'),
(24, 1, 'sop.section.created', 'sop_section', '6', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-25 16:35:37'),
(25, 1, 'user.login', 'user', '1', NULL, NULL, NULL, '2026-07-25 16:46:56'),
(26, 1, 'user.login', 'user', '1', NULL, NULL, NULL, '2026-07-25 17:18:12'),
(27, 17, 'user.login', 'user', '17', NULL, NULL, NULL, '2026-07-25 17:59:04'),
(28, 1, 'user.login', 'user', '1', NULL, NULL, NULL, '2026-07-26 07:43:57'),
(29, 1, 'sop.attachment.uploaded', 'sop_document', '1', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-26 07:50:11'),
(30, 1, 'sop.created', 'sop', '4', '{\"title\":\"as\",\"code\":\"SOP-7439-ASX\",\"status\":\"Draft\"}', NULL, NULL, '2026-07-26 15:07:37'),
(31, 1, 'sop.attachment.uploaded', 'sop_document', '2', '{\"sop_id\":\"4\"}', NULL, NULL, '2026-07-26 15:09:08'),
(32, 1, 'user.login', 'user', '1', NULL, NULL, NULL, '2026-07-26 20:05:23'),
(33, 1, 'sop.section.created', 'sop_section', '63', '{\"sop_id\":\"16\"}', NULL, NULL, '2026-07-26 20:37:23'),
(34, 1, 'sop.updated', 'sop', '1', '{\"title\":\"TEST\",\"description\":\"Testing\",\"department_id\":2}', NULL, NULL, '2026-07-26 20:55:47'),
(35, 1, 'user.login', 'user', '1', NULL, NULL, NULL, '2026-07-26 21:53:38'),
(36, 1, 'sop.created', 'sop', '1', '{\"title\":\"IT FUNDAMENTALS OF PROGRAMMING\",\"code\":\"IT-FUNDAMENTALS-OF-PROGRAMMING-MS2F5PRB\",\"status\":\"Draft\"}', NULL, NULL, '2026-07-26 23:18:29'),
(37, 1, 'sop.updated', 'sop', '1', '{\"title\":\"IT FUNDAMENTALS OF PROGRAMMING\",\"description\":\"asd\",\"department_id\":5}', NULL, NULL, '2026-07-26 23:33:10'),
(38, 1, 'sop.created', 'sop', '4', '{\"title\":\"Test SOP\",\"code\":\"SOP-4092-TES\",\"status\":\"Draft\"}', NULL, NULL, '2026-07-27 00:13:34'),
(39, 1, 'user.login', 'user', '1', NULL, NULL, NULL, '2026-07-27 00:21:56'),
(40, 1, 'sop.created', 'sop', '5', '{\"title\":\"FIRE EVACUATION PROCEDURE\",\"code\":\"SOP-8162-FIR\",\"status\":\"Draft\"}', NULL, NULL, '2026-07-27 00:48:19'),
(41, 1, 'sop.section.created', 'sop_section', '1', '{\"sop_id\":\"5\"}', NULL, NULL, '2026-07-27 00:48:19'),
(42, 1, 'sop.section.created', 'sop_section', '2', '{\"sop_id\":\"5\"}', NULL, NULL, '2026-07-27 00:48:19'),
(43, 1, 'sop.step.created', 'sop_step', '1', '{\"sop_id\":\"5\"}', NULL, NULL, '2026-07-27 00:48:19'),
(44, 1, 'sop.section.created', 'sop_section', '3', '{\"sop_id\":\"5\"}', NULL, NULL, '2026-07-27 00:48:19'),
(45, 1, 'sop.section.created', 'sop_section', '4', '{\"sop_id\":\"5\"}', NULL, NULL, '2026-07-27 00:48:19'),
(46, 1, 'sop.section.created', 'sop_section', '5', '{\"sop_id\":\"5\"}', NULL, NULL, '2026-07-27 00:56:26'),
(47, 1, 'sop.section.created', 'sop_section', '6', '{\"sop_id\":\"5\"}', NULL, NULL, '2026-07-27 00:56:30'),
(48, 1, 'sop.section.created', 'sop_section', '7', '{\"sop_id\":\"5\"}', NULL, NULL, '2026-07-27 00:56:32'),
(49, 1, 'sop.section.created', 'sop_section', '8', '{\"sop_id\":\"5\"}', NULL, NULL, '2026-07-27 00:56:36'),
(50, 1, 'sop.attachment.uploaded', 'sop_document', '1', '{\"sop_id\":\"5\"}', NULL, NULL, '2026-07-27 00:57:00'),
(51, 1, 'sop.section.created', 'sop_section', '9', '{\"sop_id\":\"5\"}', NULL, NULL, '2026-07-27 00:57:27'),
(52, 1, 'sop.section.created', 'sop_section', '10', '{\"sop_id\":\"5\"}', NULL, NULL, '2026-07-27 00:57:28'),
(53, 1, 'sop.section.created', 'sop_section', '11', '{\"sop_id\":\"5\"}', NULL, NULL, '2026-07-27 00:57:33'),
(54, 1, 'sop.section.created', 'sop_section', '12', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-27 01:20:32'),
(55, 1, 'sop.section.created', 'sop_section', '13', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-27 01:20:35'),
(56, 1, 'sop.section.created', 'sop_section', '14', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-27 01:20:37'),
(57, 1, 'sop.section.created', 'sop_section', '15', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-27 01:20:39'),
(58, 1, 'sop.section.created', 'sop_section', '16', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-27 01:23:22'),
(59, 1, 'sop.section.created', 'sop_section', '17', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-27 01:23:23'),
(60, 1, 'sop.section.created', 'sop_section', '18', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-27 01:23:26'),
(61, 1, 'sop.section.created', 'sop_section', '19', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-27 01:23:33'),
(62, 1, 'sop.section.created', 'sop_section', '20', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-27 01:23:38'),
(63, 1, 'sop.section.created', 'sop_section', '21', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-27 01:23:39'),
(64, 1, 'sop.section.created', 'sop_section', '22', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-27 01:23:43'),
(65, 1, 'sop.section.created', 'sop_section', '23', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-27 01:23:52'),
(66, 1, 'sop.section.created', 'sop_section', '24', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-27 01:23:56'),
(67, 1, 'sop.section.created', 'sop_section', '25', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-27 01:24:01'),
(68, 1, 'sop.created', 'sop', '6', '{\"title\":\"DIGITAL MARKETING\",\"code\":\"SOP-0502-DIG\",\"status\":\"Draft\"}', NULL, NULL, '2026-07-27 01:26:31'),
(69, 1, 'sop.section.created', 'sop_section', '26', '{\"sop_id\":\"6\"}', NULL, NULL, '2026-07-27 01:26:32'),
(70, 1, 'sop.section.created', 'sop_section', '27', '{\"sop_id\":\"6\"}', NULL, NULL, '2026-07-27 01:26:32'),
(71, 1, 'sop.step.created', 'sop_step', '2', '{\"sop_id\":\"6\"}', NULL, NULL, '2026-07-27 01:26:32'),
(72, 1, 'sop.section.created', 'sop_section', '28', '{\"sop_id\":\"6\"}', NULL, NULL, '2026-07-27 01:26:32'),
(73, 1, 'sop.section.created', 'sop_section', '29', '{\"sop_id\":\"6\"}', NULL, NULL, '2026-07-27 01:26:32'),
(74, 1, 'sop.section.created', 'sop_section', '30', '{\"sop_id\":\"6\"}', NULL, NULL, '2026-07-27 01:27:09'),
(75, 1, 'sop.section.created', 'sop_section', '31', '{\"sop_id\":\"6\"}', NULL, NULL, '2026-07-27 01:27:21'),
(76, 1, 'sop.section.created', 'sop_section', '32', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-27 06:38:03'),
(77, 1, 'sop.section.created', 'sop_section', '33', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-27 06:38:05'),
(78, 1, 'sop.section.created', 'sop_section', '34', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-27 06:38:09'),
(79, 1, 'sop.section.created', 'sop_section', '35', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-27 06:38:16'),
(80, 1, 'sop.section.created', 'sop_section', '36', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-27 06:42:24'),
(81, 1, 'sop.section.created', 'sop_section', '37', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-27 06:42:26'),
(82, 1, 'sop.section.created', 'sop_section', '38', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-27 06:42:30'),
(83, 1, 'sop.section.created', 'sop_section', '39', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-27 06:44:08'),
(84, 1, 'sop.section.created', 'sop_section', '40', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-27 06:44:10'),
(85, 1, 'sop.section.created', 'sop_section', '41', '{\"sop_id\":\"1\"}', NULL, NULL, '2026-07-27 06:47:00'),
(86, 2, 'user.login', 'user', '2', NULL, NULL, NULL, '2026-07-27 06:52:11'),
(87, 1, 'sop.updated', 'sop', '6', '{\"title\":\"TRAINING PROCEDURE\",\"description\":\"TESTING\",\"department_id\":5}', NULL, NULL, '2026-07-27 07:46:57'),
(88, 1, 'sop.attachment.uploaded', 'sop_document', '2', '{\"sop_id\":\"6\"}', NULL, NULL, '2026-07-27 07:47:35'),
(89, 6, 'user.login', 'user', '6', NULL, NULL, NULL, '2026-07-27 13:31:17'),
(90, 2, 'user.login', 'user', '2', NULL, NULL, NULL, '2026-07-27 13:32:23'),
(91, 2, 'business.created', 'business', '2', '{\"business_code\":\"ABC-002\",\"business_name\":\"BAA Digital\"}', NULL, NULL, '2026-07-27 17:08:14'),
(92, 2, 'business.updated', 'business', '2', '{\"status\":\"active\"}', NULL, NULL, '2026-07-27 17:09:43'),
(93, 2, 'business.updated', 'business', '2', '{\"status\":\"inactive\"}', NULL, NULL, '2026-07-27 17:09:45'),
(94, 2, 'business.updated', 'business', '2', '{\"status\":\"active\"}', NULL, NULL, '2026-07-27 17:09:46'),
(95, 2, 'business.updated', 'business', '1', '{\"status\":\"active\"}', NULL, NULL, '2026-07-27 17:09:48'),
(96, 2, 'business.updated', 'business', '2', '{\"status\":\"inactive\"}', NULL, NULL, '2026-07-27 17:09:50'),
(97, 2, 'business.updated', 'business', '1', '{\"status\":\"inactive\"}', NULL, NULL, '2026-07-27 17:09:51'),
(98, 2, 'business.updated', 'business', '1', '{\"status\":\"active\"}', NULL, NULL, '2026-07-27 17:09:52'),
(99, 2, 'business.updated', 'business', '2', '{\"status\":\"active\"}', NULL, NULL, '2026-07-27 17:09:53'),
(100, 2, 'business.updated', 'business', '2', '{\"status\":\"active\"}', NULL, NULL, '2026-07-27 17:10:38'),
(101, 2, 'business.updated', 'business', '2', '{\"status\":\"inactive\"}', NULL, NULL, '2026-07-27 17:10:38'),
(102, 2, 'business.updated', 'business', '2', '{\"status\":\"active\"}', NULL, NULL, '2026-07-27 17:10:39'),
(103, 2, 'business.updated', 'business', '2', '{\"status\":\"inactive\"}', NULL, NULL, '2026-07-27 17:18:55'),
(104, 2, 'business.updated', 'business', '2', '{\"status\":\"active\"}', NULL, NULL, '2026-07-27 17:18:57'),
(105, 2, 'business.updated', 'business', '2', '{\"status\":\"inactive\"}', NULL, NULL, '2026-07-27 17:18:58'),
(106, 2, 'business.updated', 'business', '2', '{\"status\":\"active\"}', NULL, NULL, '2026-07-27 17:19:01'),
(107, 2, 'business.updated', 'business', '2', '{\"status\":\"inactive\"}', NULL, NULL, '2026-07-27 17:21:49'),
(108, 2, 'business.updated', 'business', '2', '{\"status\":\"active\"}', NULL, NULL, '2026-07-27 17:21:49'),
(109, 2, 'sop.created', 'sop', '7', '{\"title\":\"JAVASCRIPT ALGORITHM\",\"code\":\"SOP-0550-JAV\",\"status\":\"Draft\"}', NULL, NULL, '2026-07-27 17:35:51'),
(110, 2, 'sop.section.created', 'sop_section', '44', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-27 17:35:52'),
(111, 2, 'sop.section.created', 'sop_section', '45', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-27 17:35:52'),
(112, 2, 'sop.step.created', 'sop_step', '5', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-27 17:35:52'),
(113, 2, 'sop.section.created', 'sop_section', '46', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-27 17:35:52'),
(114, 2, 'sop.section.created', 'sop_section', '47', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-27 17:35:52'),
(115, 2, 'business.updated', 'business', '2', '{\"status\":\"inactive\"}', NULL, NULL, '2026-07-27 17:44:44'),
(116, 2, 'business.updated', 'business', '2', '{\"business_code\":\"ABC-002\",\"business_name\":\"BAA Digital\",\"description\":\"\",\"logo_url\":\"/api/uploads/businesses/1785174295041-667386444_1657819405543601_5065773681160543435_n.png\",\"email\":\"BAAdigital@example.com\",\"phone\":\"090909090909\",\"address\":\"Amat street, Northeastern Mindanao colleges, Surigao City\",\"status\":\"inactive\"}', NULL, NULL, '2026-07-27 17:45:06'),
(117, 2, 'business.updated', 'business', '2', '{\"status\":\"active\"}', NULL, NULL, '2026-07-27 17:50:21'),
(118, 2, 'business.updated', 'business', '2', '{\"status\":\"inactive\"}', NULL, NULL, '2026-07-27 17:50:22'),
(119, 2, 'business.updated', 'business', '2', '{\"status\":\"active\"}', NULL, NULL, '2026-07-27 17:50:24'),
(120, 2, 'business.updated', 'business', '2', '{\"business_code\":\"ABC-002\",\"business_name\":\"BAA Digital\",\"description\":\"Functionality Check\",\"logo_url\":\"/api/uploads/businesses/1785175091111-667386444_1657819405543601_5065773681160543435_n.png\",\"email\":\"BAAdigital@example.com\",\"phone\":\"090909090909\",\"address\":\"Amat street, Northeastern Mindanao colleges, Surigao City\",\"status\":\"active\"}', NULL, NULL, '2026-07-27 17:58:26'),
(121, 2, 'business.updated', 'business', '2', '{\"status\":\"inactive\"}', NULL, NULL, '2026-07-27 17:58:33'),
(122, 2, 'business.updated', 'business', '2', '{\"status\":\"active\"}', NULL, NULL, '2026-07-27 17:58:33'),
(123, 2, 'business.updated', 'business', '2', '{\"status\":\"inactive\"}', NULL, NULL, '2026-07-27 18:01:26'),
(124, 2, 'business.updated', 'business', '2', '{\"status\":\"active\"}', NULL, NULL, '2026-07-27 18:01:29'),
(125, 2, 'business.updated', 'business', '1', '{\"status\":\"inactive\"}', NULL, NULL, '2026-07-27 18:01:31'),
(126, 2, 'business.updated', 'business', '1', '{\"status\":\"active\"}', NULL, NULL, '2026-07-27 18:01:33'),
(127, 2, 'business.updated', 'business', '2', '{\"status\":\"inactive\"}', NULL, NULL, '2026-07-27 18:12:07'),
(128, 2, 'business.updated', 'business', '2', '{\"status\":\"active\"}', NULL, NULL, '2026-07-27 18:12:10'),
(129, 2, 'business.updated', 'business', '1', '{\"status\":\"inactive\"}', NULL, NULL, '2026-07-27 18:12:14'),
(130, 2, 'business.updated', 'business', '1', '{\"status\":\"active\"}', NULL, NULL, '2026-07-27 18:12:16'),
(131, 2, 'business.updated', 'business', '2', '{\"status\":\"inactive\"}', NULL, NULL, '2026-07-27 18:26:10'),
(132, 2, 'business.updated', 'business', '2', '{\"status\":\"active\"}', NULL, NULL, '2026-07-27 18:26:12'),
(133, 2, 'business.updated', 'business', '2', '{\"status\":\"inactive\"}', NULL, NULL, '2026-07-27 18:26:13'),
(134, 2, 'business.updated', 'business', '2', '{\"status\":\"active\"}', NULL, NULL, '2026-07-27 18:26:14'),
(135, 2, 'business.updated', 'business', '2', '{\"status\":\"inactive\"}', NULL, NULL, '2026-07-27 18:27:14'),
(136, 2, 'business.updated', 'business', '2', '{\"status\":\"active\"}', NULL, NULL, '2026-07-27 18:27:16'),
(137, 2, 'business.updated', 'business', '2', '{\"status\":\"inactive\"}', NULL, NULL, '2026-07-27 18:27:17'),
(138, 2, 'business.updated', 'business', '2', '{\"status\":\"active\"}', NULL, NULL, '2026-07-27 18:27:17'),
(139, 17, 'user.login', 'user', '17', NULL, NULL, NULL, '2026-07-28 02:41:46'),
(140, 1, 'user.login', 'user', '1', NULL, NULL, NULL, '2026-07-28 08:25:16'),
(141, 2, 'business.updated', 'business', '2', '{\"status\":\"inactive\"}', NULL, NULL, '2026-07-28 08:34:38'),
(142, 2, 'business.updated', 'business', '2', '{\"status\":\"active\"}', NULL, NULL, '2026-07-28 08:34:39'),
(143, 2, 'business.updated', 'business', '1', '{\"status\":\"inactive\"}', NULL, NULL, '2026-07-28 08:34:41'),
(144, 2, 'business.updated', 'business', '1', '{\"status\":\"active\"}', NULL, NULL, '2026-07-28 08:34:41'),
(145, 2, 'sop.section.created', 'sop_section', '48', '{\"sop_id\":\"6\"}', NULL, NULL, '2026-07-28 09:16:37'),
(146, 2, 'sop.section.created', 'sop_section', '49', '{\"sop_id\":\"6\"}', NULL, NULL, '2026-07-28 09:16:38'),
(147, 2, 'sop.section.created', 'sop_section', '50', '{\"sop_id\":\"6\"}', NULL, NULL, '2026-07-28 09:16:39'),
(148, 2, 'sop.section.created', 'sop_section', '51', '{\"sop_id\":\"6\"}', NULL, NULL, '2026-07-28 09:16:41'),
(149, 2, 'sop.section.created', 'sop_section', '52', '{\"sop_id\":\"6\"}', NULL, NULL, '2026-07-28 09:16:44'),
(150, 2, 'category.created', 'category', '1', '{\"name\":\"HR Sub\",\"department_id\":\"2\"}', NULL, NULL, '2026-07-28 09:23:26'),
(151, 2, 'sop.section.created', 'sop_section', '53', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:44:09'),
(152, 2, 'sop.section.created', 'sop_section', '54', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:44:11'),
(153, 2, 'sop.section.created', 'sop_section', '55', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:44:12'),
(154, 2, 'sop.section.created', 'sop_section', '56', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:44:13'),
(155, 2, 'sop.section.created', 'sop_section', '57', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:44:15'),
(156, 2, 'sop.section.created', 'sop_section', '58', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:44:16'),
(157, 2, 'sop.section.created', 'sop_section', '59', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:44:18'),
(158, 2, 'sop.section.created', 'sop_section', '60', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:44:19'),
(159, 2, 'sop.section.created', 'sop_section', '61', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:44:19'),
(160, 2, 'sop.section.created', 'sop_section', '62', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:44:20'),
(161, 2, 'sop.section.created', 'sop_section', '63', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:49:08'),
(162, 2, 'sop.section.created', 'sop_section', '64', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:49:09'),
(163, 2, 'sop.section.created', 'sop_section', '65', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:49:10'),
(164, 2, 'sop.section.created', 'sop_section', '66', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:49:12'),
(165, 2, 'sop.section.created', 'sop_section', '67', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:49:15'),
(166, 2, 'sop.section.created', 'sop_section', '68', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:49:18'),
(167, 2, 'sop.section.created', 'sop_section', '69', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:52:25'),
(168, 2, 'sop.section.created', 'sop_section', '70', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:52:25'),
(169, 2, 'sop.section.created', 'sop_section', '71', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:52:26'),
(170, 2, 'sop.section.created', 'sop_section', '72', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:52:27'),
(171, 2, 'sop.section.created', 'sop_section', '73', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:52:27'),
(172, 2, 'sop.section.created', 'sop_section', '74', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:52:29'),
(173, 2, 'sop.section.created', 'sop_section', '75', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:52:42'),
(174, 2, 'sop.section.created', 'sop_section', '76', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:52:43'),
(175, 2, 'sop.section.created', 'sop_section', '77', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:52:46'),
(176, 2, 'sop.section.created', 'sop_section', '78', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:52:47'),
(177, 2, 'sop.section.created', 'sop_section', '79', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:52:53'),
(178, 2, 'sop.section.created', 'sop_section', '80', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:52:58'),
(179, 2, 'sop.section.created', 'sop_section', '81', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:52:59'),
(180, 2, 'sop.section.created', 'sop_section', '82', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:53:03'),
(181, 2, 'sop.section.created', 'sop_section', '83', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:53:23'),
(182, 2, 'sop.section.created', 'sop_section', '84', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:53:33'),
(183, 2, 'sop.section.created', 'sop_section', '85', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:55:06'),
(184, 2, 'sop.section.created', 'sop_section', '86', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:55:07'),
(185, 2, 'sop.section.created', 'sop_section', '87', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:55:46'),
(186, 2, 'sop.section.created', 'sop_section', '88', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:55:47'),
(187, 2, 'sop.section.created', 'sop_section', '89', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:55:48'),
(188, 2, 'sop.section.created', 'sop_section', '90', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:55:49'),
(189, 2, 'sop.section.created', 'sop_section', '91', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:55:54'),
(190, 2, 'sop.section.created', 'sop_section', '92', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 11:57:04'),
(191, 2, 'sop.section.created', 'sop_section', '93', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 12:00:07'),
(192, 2, 'sop.section.created', 'sop_section', '94', '{\"sop_id\":\"7\"}', NULL, NULL, '2026-07-28 12:00:32');

-- --------------------------------------------------------

--
-- Table structure for table `businesses`
--

CREATE TABLE `businesses` (
  `id` int(11) NOT NULL,
  `business_code` varchar(50) NOT NULL,
  `business_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `logo_url` varchar(500) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `businesses`
--

INSERT INTO `businesses` (`id`, `business_code`, `business_name`, `description`, `logo_url`, `email`, `phone`, `address`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(1, 'BUS-001', 'PAFR', NULL, NULL, NULL, NULL, NULL, 'active', NULL, 2, '2026-07-27 13:10:43', '2026-07-28 08:34:41'),
(2, 'ABC-002', 'BAA Digital', 'Functionality Check', '/api/uploads/businesses/1785175091111-667386444_1657819405543601_5065773681160543435_n.png', 'BAAdigital@example.com', '090909090909', 'Amat street, Northeastern Mindanao colleges, Surigao City', 'active', 2, 2, '2026-07-27 17:08:14', '2026-07-28 08:34:39');

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `public_id` char(36) NOT NULL DEFAULT uuid(),
  `department_id` int(11) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `public_id`, `department_id`, `name`, `description`, `is_active`, `created_by`, `updated_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'fcd893d9-8a65-11f1-ba5d-0b68e95a0407', 2, 'HR Sub', NULL, 1, 2, NULL, '2026-07-28 09:23:26', '2026-07-28 09:23:26', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `content_progress`
--

CREATE TABLE `content_progress` (
  `id` int(11) NOT NULL,
  `enrollment_id` int(11) NOT NULL,
  `content_id` int(11) NOT NULL,
  `is_completed` tinyint(1) NOT NULL DEFAULT 0,
  `time_spent` int(11) DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `courses`
--

CREATE TABLE `courses` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `difficulty` enum('beginner','intermediate','advanced','all_levels') NOT NULL DEFAULT 'beginner',
  `status` enum('draft','published','archived','under_review') NOT NULL DEFAULT 'draft',
  `instructor_id` int(11) DEFAULT NULL,
  `thumbnail_url` varchar(500) DEFAULT NULL,
  `prerequisites` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`prerequisites`)),
  `learning_outcomes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`learning_outcomes`)),
  `max_enrollments` int(11) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `grading_scale` enum('STANDARD','PERCENTAGE','PASS_FAIL') NOT NULL DEFAULT 'STANDARD',
  `allow_self_enrollment` tinyint(1) NOT NULL DEFAULT 1,
  `send_completion_certificates` tinyint(1) NOT NULL DEFAULT 0,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `course_enrollments`
--

CREATE TABLE `course_enrollments` (
  `id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `role` enum('instructor','teaching_assistant','learner','guest') NOT NULL DEFAULT 'learner',
  `status` enum('pending','active','completed','dropped','suspended') NOT NULL DEFAULT 'active',
  `enrolled_at` datetime NOT NULL DEFAULT current_timestamp(),
  `completed_at` datetime DEFAULT NULL,
  `progress_percentage` int(11) NOT NULL DEFAULT 0,
  `final_grade` decimal(5,2) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `course_modules`
--

CREATE TABLE `course_modules` (
  `id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `type` enum('chapter','unit','lesson','section','topic') NOT NULL DEFAULT 'chapter',
  `order_index` int(11) NOT NULL DEFAULT 0,
  `release_date` datetime DEFAULT NULL,
  `due_date` datetime DEFAULT NULL,
  `is_graded` tinyint(1) NOT NULL DEFAULT 0,
  `max_score` int(11) DEFAULT NULL,
  `is_visible` tinyint(1) NOT NULL DEFAULT 1,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `id` int(11) NOT NULL,
  `business_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `parent_department_id` int(11) DEFAULT NULL,
  `head_user_id` int(11) DEFAULT NULL,
  `status` enum('active','inactive','archived') NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `departments`
--

INSERT INTO `departments` (`id`, `business_id`, `name`, `code`, `description`, `parent_department_id`, `head_user_id`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 'Operations', 'OPS', 'Operations department', NULL, NULL, 'active', '2026-07-24 00:11:38', '2026-07-27 13:11:10'),
(2, 1, 'HR & Admin', 'HR', 'Human Resources & Administration', NULL, NULL, 'active', '2026-07-24 00:11:38', '2026-07-27 13:11:10'),
(3, 1, 'Sales & Marketing', 'S&M', 'Sales and Marketing department', NULL, NULL, 'active', '2026-07-24 00:11:38', '2026-07-27 13:11:10'),
(4, 1, 'Finance', 'FIN', 'Finance department', NULL, NULL, 'active', '2026-07-24 00:11:38', '2026-07-27 13:11:10'),
(5, 1, 'IT', 'IT', 'Information Technology department', NULL, NULL, 'active', '2026-07-24 00:11:38', '2026-07-27 13:11:10');

-- --------------------------------------------------------

--
-- Table structure for table `department_members`
--

CREATE TABLE `department_members` (
  `id` int(11) NOT NULL,
  `department_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `role` enum('member','head','admin') NOT NULL DEFAULT 'member',
  `joined_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `discussions`
--

CREATE TABLE `discussions` (
  `id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `module_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `is_pinned` tinyint(1) NOT NULL DEFAULT 0,
  `is_closed` tinyint(1) NOT NULL DEFAULT 0,
  `reply_count` int(11) NOT NULL DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `discussion_replies`
--

CREATE TABLE `discussion_replies` (
  `id` int(11) NOT NULL,
  `discussion_id` int(11) NOT NULL,
  `parent_reply_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `reply_text` text NOT NULL,
  `is_instructor` tinyint(1) NOT NULL DEFAULT 0,
  `is_pinned` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `external_trainings`
--

CREATE TABLE `external_trainings` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `provider` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('pending','approved','rejected','completed') NOT NULL DEFAULT 'pending',
  `reservist_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `external_training_attachments`
--

CREATE TABLE `external_training_attachments` (
  `id` int(11) NOT NULL,
  `external_training_id` int(11) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `file_size` int(11) DEFAULT NULL,
  `uploaded_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `grades`
--

CREATE TABLE `grades` (
  `id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `item_id` int(11) DEFAULT NULL,
  `item_type` enum('quiz','assignment','module','course') NOT NULL DEFAULT 'course',
  `score` decimal(6,2) NOT NULL DEFAULT 0.00,
  `max_score` decimal(6,2) NOT NULL DEFAULT 100.00,
  `letter_grade` varchar(5) DEFAULT NULL,
  `feedback` text DEFAULT NULL,
  `graded_by` int(11) DEFAULT NULL,
  `is_finalized` tinyint(1) NOT NULL DEFAULT 0,
  `is_released` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `groups`
--

CREATE TABLE `groups` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `arsen_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `module_content`
--

CREATE TABLE `module_content` (
  `id` int(11) NOT NULL,
  `module_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `type` enum('video','reading','document','quiz','assignment','link','presentation','downloadable','live_session','interactive') NOT NULL DEFAULT 'reading',
  `description` text DEFAULT NULL,
  `order_index` int(11) NOT NULL DEFAULT 0,
  `url` varchar(500) DEFAULT NULL,
  `duration` int(11) DEFAULT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT 1,
  `allow_access_after` datetime DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text DEFAULT NULL,
  `type` enum('info','warning','success','error') NOT NULL DEFAULT 'info',
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `link` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `display_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `permissions`
--

INSERT INTO `permissions` (`id`, `name`, `display_name`, `description`, `category`, `is_active`, `created_at`) VALUES
(1, 'view_dashboard', 'View Dashboard', NULL, 'dashboard', 1, '2026-07-24 00:11:38'),
(2, 'manage_users', 'Manage Users', NULL, 'users', 1, '2026-07-24 00:11:38'),
(3, 'manage_departments', 'Manage Departments', NULL, 'departments', 1, '2026-07-24 00:11:38'),
(4, 'manage_sops', 'Manage SOPs', NULL, 'sops', 1, '2026-07-24 00:11:38'),
(5, 'manage_courses', 'Manage Courses', NULL, 'courses', 1, '2026-07-24 00:11:38'),
(6, 'manage_assessments', 'Manage Assessments', NULL, 'assessments', 1, '2026-07-24 00:11:38'),
(7, 'view_reports', 'View Reports', NULL, 'reports', 1, '2026-07-24 00:11:38'),
(8, 'manage_settings', 'Manage Settings', NULL, 'settings', 1, '2026-07-24 00:11:38'),
(9, 'view_audit_logs', 'View Audit Logs', NULL, 'audit', 1, '2026-07-24 00:11:38');

-- --------------------------------------------------------

--
-- Table structure for table `quizzes`
--

CREATE TABLE `quizzes` (
  `id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `module_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `time_limit` int(11) DEFAULT NULL,
  `max_score` int(11) NOT NULL DEFAULT 100,
  `attempts_allowed` int(11) NOT NULL DEFAULT 1,
  `passing_score` int(11) DEFAULT NULL,
  `feedback_policy` enum('immediate','on_completion','manual') NOT NULL DEFAULT 'immediate',
  `status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quiz_questions`
--

CREATE TABLE `quiz_questions` (
  `id` int(11) NOT NULL,
  `quiz_id` int(11) NOT NULL,
  `type` enum('multiple_choice','multiple_select','fill_blank','essay') NOT NULL DEFAULT 'multiple_choice',
  `question_text` text NOT NULL,
  `options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`options`)),
  `correct_answer` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`correct_answer`)),
  `points` int(11) NOT NULL DEFAULT 1,
  `order_index` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quiz_submissions`
--

CREATE TABLE `quiz_submissions` (
  `id` int(11) NOT NULL,
  `quiz_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `answers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`answers`)),
  `score` int(11) DEFAULT NULL,
  `max_score` int(11) DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `graded_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

CREATE TABLE `reports` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `type` enum('attendance','training','performance','compliance') NOT NULL DEFAULT 'attendance',
  `generated_by` int(11) DEFAULT NULL,
  `parameters` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`parameters`)),
  `file_path` varchar(500) DEFAULT NULL,
  `status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reservists`
--

CREATE TABLE `reservists` (
  `id` int(11) NOT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `id_number` varchar(50) DEFAULT NULL,
  `service_number` varchar(50) DEFAULT NULL,
  `status_bcmt` tinyint(1) NOT NULL DEFAULT 0,
  `status_adt` tinyint(1) NOT NULL DEFAULT 0,
  `status_vadt` tinyint(1) NOT NULL DEFAULT 0,
  `status_rotc` tinyint(1) NOT NULL DEFAULT 0,
  `status_others` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reservist_assignments`
--

CREATE TABLE `reservist_assignments` (
  `id` int(11) NOT NULL,
  `reservist_id` int(11) NOT NULL,
  `squadron_id` int(11) DEFAULT NULL,
  `group_id` int(11) DEFAULT NULL,
  `arsen_id` int(11) DEFAULT NULL,
  `assignment_date` date DEFAULT NULL,
  `status` enum('active','inactive','transferred') NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `display_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`, `display_name`, `description`, `is_active`, `created_at`) VALUES
(1, 'super_admin', 'Super Admin', 'Full system access', 1, '2026-07-24 00:11:37'),
(2, 'admin', 'Admin', 'Admin with scope management', 1, '2026-07-24 00:11:37'),
(3, 'department_head', 'Department Head', 'Department-level manager', 1, '2026-07-24 00:11:37'),
(4, 'employee', 'Employee', 'Standard user / learner', 1, '2026-07-24 00:11:37');

-- --------------------------------------------------------

--
-- Table structure for table `role_permissions`
--

CREATE TABLE `role_permissions` (
  `id` int(11) NOT NULL,
  `role_name` varchar(100) NOT NULL,
  `permission_name` varchar(100) NOT NULL,
  `granted_by` int(11) DEFAULT NULL,
  `granted_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `role_permissions`
--

INSERT INTO `role_permissions` (`id`, `role_name`, `permission_name`, `granted_by`, `granted_at`) VALUES
(1, 'super_admin', 'view_dashboard', NULL, '2026-07-24 00:11:38'),
(2, 'super_admin', 'manage_users', NULL, '2026-07-24 00:11:38'),
(3, 'super_admin', 'manage_departments', NULL, '2026-07-24 00:11:38'),
(4, 'super_admin', 'manage_sops', NULL, '2026-07-24 00:11:38'),
(5, 'super_admin', 'manage_courses', NULL, '2026-07-24 00:11:38'),
(6, 'super_admin', 'manage_assessments', NULL, '2026-07-24 00:11:38'),
(7, 'super_admin', 'view_reports', NULL, '2026-07-24 00:11:38'),
(8, 'super_admin', 'manage_settings', NULL, '2026-07-24 00:11:38'),
(9, 'super_admin', 'view_audit_logs', NULL, '2026-07-24 00:11:38'),
(10, 'admin', 'view_dashboard', NULL, '2026-07-24 00:11:38'),
(11, 'admin', 'manage_users', NULL, '2026-07-24 00:11:38'),
(12, 'admin', 'manage_departments', NULL, '2026-07-24 00:11:38'),
(13, 'admin', 'manage_sops', NULL, '2026-07-24 00:11:38'),
(14, 'admin', 'manage_courses', NULL, '2026-07-24 00:11:38'),
(15, 'admin', 'manage_assessments', NULL, '2026-07-24 00:11:38'),
(16, 'admin', 'view_reports', NULL, '2026-07-24 00:11:38'),
(17, 'department_head', 'view_dashboard', NULL, '2026-07-24 00:11:38'),
(18, 'department_head', 'manage_sops', NULL, '2026-07-24 00:11:38'),
(19, 'department_head', 'manage_courses', NULL, '2026-07-24 00:11:38'),
(20, 'department_head', 'manage_assessments', NULL, '2026-07-24 00:11:38'),
(21, 'department_head', 'view_reports', NULL, '2026-07-24 00:11:38'),
(22, 'employee', 'view_dashboard', NULL, '2026-07-24 00:11:38'),
(23, 'employee', 'view_reports', NULL, '2026-07-24 00:11:38');

-- --------------------------------------------------------

--
-- Table structure for table `schema_migrations`
--

CREATE TABLE `schema_migrations` (
  `id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `applied_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `schema_migrations`
--

INSERT INTO `schema_migrations` (`id`, `filename`, `applied_at`) VALUES
(12, '001_sop_enterprise_schema.sql', '2026-07-26 23:06:22');

-- --------------------------------------------------------

--
-- Table structure for table `sops`
--

CREATE TABLE `sops` (
  `id` int(11) NOT NULL,
  `public_id` char(36) NOT NULL DEFAULT uuid(),
  `sop_code` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `department_id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `owner_user_id` int(11) DEFAULT NULL,
  `owner_id` int(11) NOT NULL,
  `current_version_id` int(11) DEFAULT NULL,
  `status` enum('Draft','For Review','Approved','Published','Archived') NOT NULL DEFAULT 'Draft',
  `created_by` int(11) NOT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0
) ;

--
-- Dumping data for table `sops`
--

INSERT INTO `sops` (`id`, `public_id`, `sop_code`, `title`, `description`, `department_id`, `category_id`, `owner_user_id`, `owner_id`, `current_version_id`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`, `deleted_at`, `is_deleted`) VALUES
(1, '4fc37cbf-8948-11f1-ba5d-0b68e95a0407', 'IT-FUNDAMENTALS-OF-PROGRAMMING-MS2F5PRB', 'IT FUNDAMENTALS OF PROGRAMMING', 'asd', 5, NULL, NULL, 1, 2, 'Approved', 1, 1, '2026-07-26 23:18:29', '2026-07-27 01:25:02', NULL, 0),
(4, '01e7beca-8950-11f1-ba5d-0b68e95a0407', 'SOP-4092-TES', 'Test SOP', 'Test desc', 1, NULL, NULL, 1, 3, 'Draft', 1, 1, '2026-07-27 00:13:34', '2026-07-27 01:20:08', NULL, 0),
(5, 'dc1d547d-8954-11f1-ba5d-0b68e95a0407', 'SOP-8162-FIR', 'FIRE EVACUATION PROCEDURE', 'Functionality check!!', 5, NULL, NULL, 1, 1, 'Draft', 1, 1, '2026-07-27 00:48:18', '2026-07-27 00:48:19', NULL, 0),
(6, '3275e0c0-895a-11f1-ba5d-0b68e95a0407', 'SOP-0502-DIG', 'TRAINING PROCEDURE', 'TESTING', 5, NULL, NULL, 1, 5, 'Draft', 1, 1, '2026-07-27 01:26:31', '2026-07-27 07:46:57', NULL, 0),
(7, '9cc9c423-89e1-11f1-ba5d-0b68e95a0407', 'SOP-0550-JAV', 'JAVASCRIPT ALGORITHM', NULL, 2, NULL, NULL, 2, 6, 'Draft', 2, 2, '2026-07-27 17:35:51', '2026-07-27 17:35:51', NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `sop_acknowledgements`
--

CREATE TABLE `sop_acknowledgements` (
  `id` int(11) NOT NULL,
  `public_id` char(36) NOT NULL DEFAULT uuid(),
  `sop_version_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `status` enum('Pending','Acknowledged','Reopened','Expired') NOT NULL DEFAULT 'Pending',
  `acknowledged_at` datetime DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sop_approvals`
--

CREATE TABLE `sop_approvals` (
  `id` int(11) NOT NULL,
  `sop_id` int(11) NOT NULL,
  `approver_user_id` int(11) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Pending',
  `comments` text DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sop_assignments`
--

CREATE TABLE `sop_assignments` (
  `id` int(11) NOT NULL,
  `public_id` char(36) NOT NULL DEFAULT uuid(),
  `sop_version_id` int(11) NOT NULL,
  `assigned_by` int(11) NOT NULL,
  `assigned_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `due_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sop_audit_logs`
--

CREATE TABLE `sop_audit_logs` (
  `id` int(11) NOT NULL,
  `public_id` char(36) NOT NULL DEFAULT uuid(),
  `entity_type` varchar(50) NOT NULL,
  `entity_id` int(11) NOT NULL,
  `action` enum('Create','Update','Delete','Publish','Restore','Download','Print','Login','Logout') NOT NULL,
  `performed_by` int(11) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sop_change_logs`
--

CREATE TABLE `sop_change_logs` (
  `id` int(11) NOT NULL,
  `sop_version_id` int(11) NOT NULL,
  `field_name` varchar(100) NOT NULL,
  `old_value` longtext DEFAULT NULL,
  `new_value` longtext DEFAULT NULL,
  `changed_by` int(11) DEFAULT NULL,
  `changed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sop_change_logs`
--

INSERT INTO `sop_change_logs` (`id`, `sop_version_id`, `field_name`, `old_value`, `new_value`, `changed_by`, `changed_at`) VALUES
(1, 2, 'status', 'Draft', 'For Review', 1, '2026-07-27 01:23:13'),
(2, 2, 'status', 'For Review', 'Approved', 1, '2026-07-27 01:25:02');

-- --------------------------------------------------------

--
-- Table structure for table `sop_course_links`
--

CREATE TABLE `sop_course_links` (
  `id` int(11) NOT NULL,
  `sop_id` int(11) NOT NULL,
  `course_id` int(11) DEFAULT NULL,
  `link_type` enum('Prerequisite','Reference','Companion') NOT NULL DEFAULT 'Reference',
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sop_documents`
--

CREATE TABLE `sop_documents` (
  `id` int(11) NOT NULL,
  `sop_version_id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `storage_path` varchar(500) NOT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `file_size` bigint(20) DEFAULT NULL,
  `document_type` enum('PDF','Word','Excel','Image','Video','Attachment') NOT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `uploaded_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sop_documents`
--

INSERT INTO `sop_documents` (`id`, `sop_version_id`, `filename`, `original_name`, `storage_path`, `mime_type`, `file_size`, `document_type`, `display_order`, `uploaded_by`, `created_at`, `deleted_at`, `is_deleted`) VALUES
(1, 1, '1785113818633-4_CIT.pdf', '4 CIT.pdf', 'uploads/sops/1785113818633-4_CIT.pdf', 'application/pdf', 74177464, 'PDF', 1, 1, '2026-07-27 00:57:00', NULL, 0),
(2, 5, '1785138454984-u607968802_lms_sop.sql', 'u607968802_lms_sop.sql', 'uploads/sops/1785138454984-u607968802_lms_sop.sql', 'application/octet-stream', 67946, 'PDF', 1, 1, '2026-07-27 07:47:35', '2026-07-27 07:47:44', 0);

-- --------------------------------------------------------

--
-- Table structure for table `sop_sections`
--

CREATE TABLE `sop_sections` (
  `id` int(11) NOT NULL,
  `sop_id` int(11) DEFAULT NULL,
  `sop_version_id` int(11) DEFAULT NULL,
  `section_type` enum('Purpose','Scope','Objectives','Responsibilities','Definitions','Safety Notes','References','Appendix') NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `content` longtext NOT NULL,
  `order_index` int(11) NOT NULL DEFAULT 0,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `sort_order` int(11) NOT NULL DEFAULT 1,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sop_sections`
--

INSERT INTO `sop_sections` (`id`, `sop_id`, `sop_version_id`, `section_type`, `title`, `content`, `order_index`, `is_deleted`, `sort_order`, `created_by`, `updated_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 5, 1, '', 'Safety Notes', 'N/A', 0, 0, 0, NULL, NULL, '2026-07-27 00:48:19', '2026-07-27 08:06:21', NULL),
(2, 5, 1, 'Scope', 'Scope', 'SOP Management', 0, 0, 0, NULL, NULL, '2026-07-27 00:48:19', '2026-07-27 08:06:21', NULL),
(3, 5, 1, 'Purpose', 'Purpose', 'For Testing', 0, 0, 0, NULL, NULL, '2026-07-27 00:48:19', '2026-07-27 08:06:21', NULL),
(4, 5, 1, 'References', 'References', 'N/A', 0, 0, 0, NULL, NULL, '2026-07-27 00:48:19', '2026-07-27 08:06:21', NULL),
(5, 5, 1, 'Purpose', 'Purpose', 'sdfasfasfd', 0, 0, 0, NULL, NULL, '2026-07-27 00:56:26', '2026-07-27 08:06:21', NULL),
(6, 5, 1, 'Scope', 'Scope', 'vcxbxcb', 1, 0, 1, NULL, NULL, '2026-07-27 00:56:30', '2026-07-27 08:06:21', NULL),
(7, 5, 1, 'References', 'References', 'sdfgfdg', 2, 0, 2, NULL, NULL, '2026-07-27 00:56:32', '2026-07-27 08:06:21', NULL),
(8, 5, 1, '', 'Safety Notes', 'cxvbxcvbxv', 3, 0, 3, NULL, NULL, '2026-07-27 00:56:36', '2026-07-27 08:06:21', NULL),
(9, 5, 1, 'Purpose', 'Purpose', '', 0, 0, 0, NULL, NULL, '2026-07-27 00:57:27', '2026-07-27 08:06:21', NULL),
(10, 5, 1, 'Scope', 'Scope', '', 1, 0, 1, NULL, NULL, '2026-07-27 00:57:28', '2026-07-27 08:06:21', NULL),
(11, 5, 1, 'References', 'References', '', 2, 0, 2, NULL, NULL, '2026-07-27 00:57:33', '2026-07-27 08:06:21', NULL),
(12, 1, 2, 'Purpose', 'Purpose', '1', 0, 0, 0, NULL, NULL, '2026-07-27 01:20:32', '2026-07-27 08:06:21', NULL),
(13, 1, 2, 'Scope', 'Scope', '2', 1, 0, 1, NULL, NULL, '2026-07-27 01:20:35', '2026-07-27 08:06:21', NULL),
(14, 1, 2, 'References', 'References', '3', 2, 0, 2, NULL, NULL, '2026-07-27 01:20:37', '2026-07-27 08:06:21', NULL),
(15, 1, 2, '', 'Safety Notes', '4', 3, 0, 3, NULL, NULL, '2026-07-27 01:20:39', '2026-07-27 08:06:21', NULL),
(16, 1, 2, 'Purpose', 'Purpose', '', 0, 0, 0, NULL, NULL, '2026-07-27 01:23:22', '2026-07-27 08:06:21', NULL),
(17, 1, 2, 'Scope', 'Scope', '', 1, 0, 1, NULL, NULL, '2026-07-27 01:23:23', '2026-07-27 08:06:21', NULL),
(18, 1, 2, 'Purpose', 'Purpose', '1', 0, 0, 0, NULL, NULL, '2026-07-27 01:23:26', '2026-07-27 08:06:21', NULL),
(19, 1, 2, 'Scope', 'Scope', '2', 1, 0, 1, NULL, NULL, '2026-07-27 01:23:33', '2026-07-27 08:06:21', NULL),
(20, 1, 2, 'References', 'References', '3', 2, 0, 2, NULL, NULL, '2026-07-27 01:23:37', '2026-07-27 08:06:21', NULL),
(21, 1, 2, '', 'Safety Notes', '4', 3, 0, 3, NULL, NULL, '2026-07-27 01:23:39', '2026-07-27 08:06:21', NULL),
(22, 1, 2, 'Purpose', 'Purpose', '1 TESTING', 0, 0, 0, NULL, NULL, '2026-07-27 01:23:43', '2026-07-27 08:06:21', NULL),
(23, 1, 2, 'Scope', 'Scope', '2 TESTING', 1, 0, 1, NULL, NULL, '2026-07-27 01:23:52', '2026-07-27 08:06:21', NULL),
(24, 1, 2, 'References', 'References', '3 TESTING', 2, 0, 2, NULL, NULL, '2026-07-27 01:23:56', '2026-07-27 08:06:21', NULL),
(25, 1, 2, '', 'Safety Notes', '4 TESTING', 3, 0, 3, NULL, NULL, '2026-07-27 01:24:01', '2026-07-27 08:06:21', NULL),
(26, 6, 5, 'Scope', 'Scope', '2', 0, 0, 0, NULL, NULL, '2026-07-27 01:26:32', '2026-07-27 08:06:21', NULL),
(27, 6, 5, '', 'Safety Notes', '4', 0, 0, 0, NULL, NULL, '2026-07-27 01:26:32', '2026-07-27 08:06:21', NULL),
(28, 6, 5, 'References', 'References', '3', 0, 0, 0, NULL, NULL, '2026-07-27 01:26:32', '2026-07-27 08:06:21', NULL),
(29, 6, 5, 'Purpose', 'Purpose', '1', 0, 0, 0, NULL, NULL, '2026-07-27 01:26:32', '2026-07-27 08:06:21', NULL),
(30, 6, 5, 'Purpose', 'Purpose', '', 0, 0, 0, NULL, NULL, '2026-07-27 01:27:09', '2026-07-27 08:06:21', NULL),
(31, 6, 5, 'Purpose', 'Purpose', '', 0, 0, 0, NULL, NULL, '2026-07-27 01:27:21', '2026-07-27 08:06:21', NULL),
(32, 1, 2, 'Purpose', 'Purpose', 'purpose', 0, 0, 0, NULL, NULL, '2026-07-27 06:38:03', '2026-07-27 08:06:21', NULL),
(33, 1, 2, 'Scope', 'Scope', 'scoped', 1, 0, 1, NULL, NULL, '2026-07-27 06:38:05', '2026-07-27 08:06:21', NULL),
(34, 1, 2, 'References', 'References', 'references', 2, 0, 2, NULL, NULL, '2026-07-27 06:38:09', '2026-07-27 08:06:21', NULL),
(35, 1, 2, '', 'Safety Notes', 'safety notes', 3, 0, 3, NULL, NULL, '2026-07-27 06:38:16', '2026-07-27 08:06:21', NULL),
(36, 1, 2, 'Purpose', 'Purpose', '', 0, 0, 0, NULL, NULL, '2026-07-27 06:42:24', '2026-07-27 08:06:21', NULL),
(37, 1, 2, 'Scope', 'Scope', '', 1, 0, 1, NULL, NULL, '2026-07-27 06:42:26', '2026-07-27 08:06:21', NULL),
(38, 1, 2, 'Purpose', 'Purpose', '', 0, 0, 0, NULL, NULL, '2026-07-27 06:42:30', '2026-07-27 08:06:21', NULL),
(39, 1, 2, 'Purpose', 'Purpose', '', 0, 0, 0, NULL, NULL, '2026-07-27 06:44:08', '2026-07-27 08:06:21', NULL),
(40, 1, 2, 'Purpose', 'Purpose', '', 0, 0, 0, NULL, NULL, '2026-07-27 06:44:10', '2026-07-27 08:06:21', NULL),
(41, 1, 2, 'Purpose', 'Purpose', '', 0, 0, 0, NULL, NULL, '2026-07-27 06:47:00', '2026-07-27 08:06:21', NULL),
(44, 7, NULL, '', 'Safety Notes', 'Notes here', 1, 0, 1, NULL, NULL, '2026-07-27 17:35:52', '2026-07-27 17:41:05', NULL),
(45, 7, NULL, 'Scope', 'Scope', 'John doe works', 1, 0, 1, NULL, NULL, '2026-07-27 17:35:52', '2026-07-27 17:41:05', NULL),
(46, 7, NULL, 'Purpose', 'Purpose', 'John doe works', 1, 0, 1, NULL, NULL, '2026-07-27 17:35:52', '2026-07-27 17:41:05', NULL),
(47, 7, NULL, 'References', 'References', 'John doe works', 1, 0, 1, NULL, NULL, '2026-07-27 17:35:52', '2026-07-27 17:41:05', NULL),
(48, 6, NULL, 'Purpose', 'Purpose', '', 1, 0, 1, NULL, NULL, '2026-07-28 09:16:37', '2026-07-28 10:40:47', NULL),
(49, 6, NULL, 'Scope', 'Scope', '', 1, 0, 1, NULL, NULL, '2026-07-28 09:16:38', '2026-07-28 09:16:38', NULL),
(50, 6, NULL, 'References', 'References', '', 2, 0, 1, NULL, NULL, '2026-07-28 09:16:39', '2026-07-28 09:16:39', NULL),
(51, 6, NULL, '', 'Safety Notes', '', 3, 0, 1, NULL, NULL, '2026-07-28 09:16:41', '2026-07-28 09:16:41', NULL),
(52, 6, NULL, 'Purpose', 'Purpose', '', 1, 0, 1, NULL, NULL, '2026-07-28 09:16:44', '2026-07-28 10:40:47', NULL),
(53, 7, NULL, 'Purpose', 'Purpose', '', 1, 0, 1, NULL, NULL, '2026-07-28 11:44:09', '2026-07-28 12:48:33', NULL),
(54, 7, NULL, 'Scope', 'Scope', '', 1, 0, 1, NULL, NULL, '2026-07-28 11:44:11', '2026-07-28 11:44:11', NULL),
(55, 7, NULL, 'References', 'References', '', 2, 0, 1, NULL, NULL, '2026-07-28 11:44:12', '2026-07-28 11:44:12', NULL),
(56, 7, NULL, '', 'Safety Notes', '', 3, 0, 1, NULL, NULL, '2026-07-28 11:44:13', '2026-07-28 11:44:13', NULL),
(57, 7, NULL, 'Purpose', 'Purpose', '', 1, 0, 1, NULL, NULL, '2026-07-28 11:44:15', '2026-07-28 12:48:33', NULL),
(58, 7, NULL, 'Scope', 'Scope', '', 1, 0, 1, NULL, NULL, '2026-07-28 11:44:16', '2026-07-28 11:44:16', NULL),
(59, 7, NULL, 'References', 'References', '', 2, 0, 1, NULL, NULL, '2026-07-28 11:44:18', '2026-07-28 11:44:18', NULL),
(60, 7, NULL, '', 'Safety Notes', '', 3, 0, 1, NULL, NULL, '2026-07-28 11:44:18', '2026-07-28 11:44:18', NULL),
(61, 7, NULL, 'Purpose', 'Purpose', '', 1, 0, 1, NULL, NULL, '2026-07-28 11:44:19', '2026-07-28 12:48:33', NULL),
(62, 7, NULL, 'Scope', 'Scope', '', 1, 0, 1, NULL, NULL, '2026-07-28 11:44:20', '2026-07-28 11:44:20', NULL),
(63, 7, NULL, 'Purpose', 'Purpose', '', 1, 0, 1, NULL, NULL, '2026-07-28 11:49:08', '2026-07-28 12:48:33', NULL),
(64, 7, NULL, 'Scope', 'Scope', '', 1, 0, 1, NULL, NULL, '2026-07-28 11:49:09', '2026-07-28 11:49:09', NULL),
(65, 7, NULL, 'Scope', 'Scope', '', 1, 0, 1, NULL, NULL, '2026-07-28 11:49:10', '2026-07-28 11:49:10', NULL),
(66, 7, NULL, 'References', 'References', '', 2, 0, 1, NULL, NULL, '2026-07-28 11:49:11', '2026-07-28 11:49:11', NULL),
(67, 7, NULL, '', 'Safety Notes', '', 3, 0, 1, NULL, NULL, '2026-07-28 11:49:15', '2026-07-28 11:49:15', NULL),
(68, 7, NULL, '', 'Safety Notes', '', 3, 0, 1, NULL, NULL, '2026-07-28 11:49:18', '2026-07-28 11:49:18', NULL),
(69, 7, NULL, '', 'Safety Notes', '', 3, 0, 1, NULL, NULL, '2026-07-28 11:52:25', '2026-07-28 11:52:25', NULL),
(70, 7, NULL, 'Purpose', 'Purpose', '', 1, 0, 1, NULL, NULL, '2026-07-28 11:52:25', '2026-07-28 12:48:33', NULL),
(71, 7, NULL, 'Scope', 'Scope', '', 1, 0, 1, NULL, NULL, '2026-07-28 11:52:26', '2026-07-28 11:52:26', NULL),
(72, 7, NULL, 'References', 'References', '', 2, 0, 1, NULL, NULL, '2026-07-28 11:52:26', '2026-07-28 11:52:26', NULL),
(73, 7, NULL, '', 'Safety Notes', '', 3, 0, 1, NULL, NULL, '2026-07-28 11:52:27', '2026-07-28 11:52:27', NULL),
(74, 7, NULL, 'Purpose', 'Purpose', '', 1, 0, 1, NULL, NULL, '2026-07-28 11:52:29', '2026-07-28 12:48:33', NULL),
(75, 7, NULL, 'Purpose', 'Purpose', '', 1, 0, 1, NULL, NULL, '2026-07-28 11:52:42', '2026-07-28 12:48:33', NULL),
(76, 7, NULL, 'Scope', 'Scope', '', 1, 0, 1, NULL, NULL, '2026-07-28 11:52:43', '2026-07-28 11:52:43', NULL),
(77, 7, NULL, 'References', 'References', '', 2, 0, 1, NULL, NULL, '2026-07-28 11:52:45', '2026-07-28 11:52:45', NULL),
(78, 7, NULL, '', 'Safety Notes', '', 3, 0, 1, NULL, NULL, '2026-07-28 11:52:47', '2026-07-28 11:52:47', NULL),
(79, 7, NULL, '', 'Safety Notes', '', 3, 0, 1, NULL, NULL, '2026-07-28 11:52:53', '2026-07-28 11:52:53', NULL),
(80, 7, NULL, 'Purpose', 'Purpose', '', 1, 0, 1, NULL, NULL, '2026-07-28 11:52:57', '2026-07-28 12:48:33', NULL),
(81, 7, NULL, 'Scope', 'Scope', '', 1, 0, 1, NULL, NULL, '2026-07-28 11:52:59', '2026-07-28 11:52:59', NULL),
(82, 7, NULL, 'References', 'References', '', 2, 0, 1, NULL, NULL, '2026-07-28 11:53:03', '2026-07-28 11:53:03', NULL),
(83, 7, NULL, 'References', 'References', '', 2, 0, 1, NULL, NULL, '2026-07-28 11:53:23', '2026-07-28 11:53:23', NULL),
(84, 7, NULL, 'References', 'References', '', 2, 0, 1, NULL, NULL, '2026-07-28 11:53:33', '2026-07-28 11:53:33', NULL),
(85, 7, NULL, 'References', 'References', '', 2, 0, 1, NULL, NULL, '2026-07-28 11:55:06', '2026-07-28 11:55:06', NULL),
(86, 7, NULL, '', 'Safety Notes', '', 3, 0, 1, NULL, NULL, '2026-07-28 11:55:07', '2026-07-28 11:55:07', NULL),
(87, 7, NULL, 'Scope', 'Scope', '', 1, 0, 1, NULL, NULL, '2026-07-28 11:55:46', '2026-07-28 11:55:46', NULL),
(88, 7, NULL, 'References', 'References', '', 2, 0, 1, NULL, NULL, '2026-07-28 11:55:46', '2026-07-28 11:55:46', NULL),
(89, 7, NULL, '', 'Safety Notes', '', 3, 0, 1, NULL, NULL, '2026-07-28 11:55:48', '2026-07-28 11:55:48', NULL),
(90, 7, NULL, 'Purpose', 'Purpose', '', 1, 0, 1, NULL, NULL, '2026-07-28 11:55:49', '2026-07-28 12:48:33', NULL),
(91, 7, NULL, 'Scope', 'Scope', '', 1, 0, 1, NULL, NULL, '2026-07-28 11:55:54', '2026-07-28 11:55:54', NULL),
(92, 7, NULL, 'Scope', 'Scope', '', 1, 0, 1, NULL, NULL, '2026-07-28 11:57:04', '2026-07-28 11:57:04', NULL),
(93, 7, NULL, 'Purpose', 'Purpose', 'afsdafasdfsad', 1, 0, 1, NULL, NULL, '2026-07-28 12:00:07', '2026-07-28 12:48:33', NULL),
(94, 7, NULL, 'Purpose', 'Purpose', 'asdfasdf', 1, 0, 1, NULL, NULL, '2026-07-28 12:00:32', '2026-07-28 12:48:33', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `sop_section_files`
--

CREATE TABLE `sop_section_files` (
  `id` int(11) NOT NULL,
  `section_id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `storage_path` varchar(500) NOT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `file_size` bigint(20) DEFAULT NULL,
  `uploaded_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sop_shares`
--

CREATE TABLE `sop_shares` (
  `id` int(11) NOT NULL,
  `sop_id` int(11) NOT NULL,
  `share_type` varchar(100) NOT NULL DEFAULT 'internal',
  `share_with` varchar(255) DEFAULT NULL,
  `permissions` varchar(100) NOT NULL DEFAULT 'view',
  `created_by` int(11) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sop_steps`
--

CREATE TABLE `sop_steps` (
  `id` int(11) NOT NULL,
  `sop_id` int(11) DEFAULT NULL,
  `section_id` int(11) DEFAULT NULL,
  `sop_version_id` int(11) DEFAULT NULL,
  `step_number` int(11) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `order_index` int(11) NOT NULL DEFAULT 0,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `instruction` longtext NOT NULL,
  `estimated_minutes` int(11) DEFAULT NULL,
  `sort_order` int(11) NOT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sop_steps`
--

INSERT INTO `sop_steps` (`id`, `sop_id`, `section_id`, `sop_version_id`, `step_number`, `title`, `description`, `order_index`, `is_deleted`, `instruction`, `estimated_minutes`, `sort_order`, `created_by`, `updated_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 5, NULL, 1, 1, 'Find the root cause of the bug', '', 0, 0, '', NULL, 0, NULL, NULL, '2026-07-27 00:48:19', '2026-07-27 08:06:21', NULL),
(2, 6, NULL, 5, 1, 'step 1', '', 0, 0, '', NULL, 0, NULL, NULL, '2026-07-27 01:26:32', '2026-07-27 08:06:21', NULL),
(5, 7, NULL, NULL, 1, 'Step One', '', 0, 0, '', NULL, 0, NULL, NULL, '2026-07-27 17:35:52', '2026-07-27 17:35:52', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `sop_step_comments`
--

CREATE TABLE `sop_step_comments` (
  `id` int(11) NOT NULL,
  `step_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `comment` text NOT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `resolved_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sop_tags`
--

CREATE TABLE `sop_tags` (
  `sop_id` int(11) NOT NULL,
  `tag_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sop_versions`
--

CREATE TABLE `sop_versions` (
  `id` int(11) NOT NULL,
  `public_id` char(36) NOT NULL DEFAULT uuid(),
  `sop_id` int(11) NOT NULL,
  `version` varchar(20) NOT NULL,
  `is_current` tinyint(1) NOT NULL DEFAULT 0,
  `change_summary` text DEFAULT NULL,
  `effective_date` date DEFAULT NULL,
  `review_date` date DEFAULT NULL,
  `status` enum('Draft','For Review','Approved','Published','Archived') NOT NULL DEFAULT 'Draft',
  `published_at` datetime DEFAULT NULL,
  `archived_at` datetime DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sop_versions`
--

INSERT INTO `sop_versions` (`id`, `public_id`, `sop_id`, `version`, `is_current`, `change_summary`, `effective_date`, `review_date`, `status`, `published_at`, `archived_at`, `created_by`, `created_at`, `deleted_at`) VALUES
(1, 'dc345cf0-8954-11f1-ba5d-0b68e95a0407', 5, '1.0', 1, NULL, NULL, NULL, 'Draft', NULL, NULL, 1, '2026-07-27 00:48:18', NULL),
(2, '4e9bc3bb-8959-11f1-ba5d-0b68e95a0407', 1, '1.0', 1, NULL, NULL, NULL, 'Approved', NULL, NULL, 1, '2026-07-26 23:18:29', NULL),
(3, '4e9bc694-8959-11f1-ba5d-0b68e95a0407', 4, '1.0', 1, NULL, NULL, NULL, 'Draft', NULL, NULL, 1, '2026-07-27 00:13:34', NULL),
(5, '328c46b4-895a-11f1-ba5d-0b68e95a0407', 6, '1.0', 1, NULL, NULL, NULL, 'Draft', NULL, NULL, 1, '2026-07-27 01:26:31', NULL),
(6, '9cdf0526-89e1-11f1-ba5d-0b68e95a0407', 7, '1.0', 1, NULL, NULL, NULL, 'Draft', NULL, NULL, 2, '2026-07-27 17:35:51', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `squadron`
--

CREATE TABLE `squadron` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `group_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `squadron_lookup`
--

CREATE TABLE `squadron_lookup` (
  `id` int(11) NOT NULL,
  `squadron_code` varchar(100) NOT NULL,
  `squadron_name` varchar(255) NOT NULL,
  `group_code` varchar(100) DEFAULT NULL,
  `arsen_code` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `submissions`
--

CREATE TABLE `submissions` (
  `id` int(11) NOT NULL,
  `assignment_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `content` text DEFAULT NULL,
  `file_path` varchar(500) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `score` int(11) DEFAULT NULL,
  `feedback` text DEFAULT NULL,
  `status` enum('draft','submitted','graded','returned') NOT NULL DEFAULT 'draft',
  `submitted_at` datetime DEFAULT NULL,
  `graded_at` datetime DEFAULT NULL,
  `graded_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

CREATE TABLE `system_settings` (
  `key` varchar(255) NOT NULL,
  `value` text NOT NULL,
  `description` text DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tags`
--

CREATE TABLE `tags` (
  `id` int(11) NOT NULL,
  `public_id` char(36) NOT NULL DEFAULT uuid(),
  `name` varchar(100) NOT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `trainings`
--

CREATE TABLE `trainings` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `type` enum('mandatory','optional','remedial') NOT NULL DEFAULT 'mandatory',
  `status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `training_attachments`
--

CREATE TABLE `training_attachments` (
  `id` int(11) NOT NULL,
  `training_id` int(11) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `file_size` int(11) DEFAULT NULL,
  `uploaded_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `role` varchar(100) DEFAULT NULL,
  `department_id` int(11) DEFAULT NULL,
  `position_title` varchar(255) DEFAULT NULL,
  `employee_id` varchar(100) DEFAULT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `employment_status` enum('Regular','Probationary','Contractual','Resigned/Terminated','Retired','On Leave') DEFAULT 'Regular',
  `date_hired` date DEFAULT NULL,
  `birthdate` date DEFAULT NULL,
  `address` text DEFAULT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `full_name`, `email`, `password_hash`, `role`, `department_id`, `position_title`, `employee_id`, `contact_number`, `employment_status`, `date_hired`, `birthdate`, `address`, `avatar_url`, `last_login_at`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'JOHn D.', 'john.d@organization.com', '$2b$12$S/3zE.i7VqG.mRPJtRSi5epE8wgAImBiRdnoxjCbeMQ4v/myCYSPO', 'super_admin', 1, 'System Administrator', 'EMP-001', '+1-555-0101', 'Regular', '2020-01-15', '1985-03-10', '123 Main St', NULL, '2026-07-28 08:25:16', 1, '2026-07-24 00:11:38', '2026-07-28 08:25:16'),
(2, 'Jane S.', 'jane.s@organization.com', '$2b$12$S/3zE.i7VqG.mRPJtRSi5epE8wgAImBiRdnoxjCbeMQ4v/myCYSPO', 'admin', 2, 'HR Manager', 'EMP-002', '+1-555-0102', 'Regular', '2021-06-01', '1990-07-22', '456 Oak Ave', NULL, '2026-07-27 13:32:23', 1, '2026-07-24 00:11:38', '2026-07-27 13:32:23'),
(3, 'Mike R.', 'mike.r@organization.com', '$2b$12$S/3zE.i7VqG.mRPJtRSi5epE8wgAImBiRdnoxjCbeMQ4v/myCYSPO', 'department_head', 1, 'Operations Lead', 'EMP-003', '+1-555-0103', 'Regular', '2019-03-15', '1988-11-05', '789 Pine Rd', NULL, NULL, 1, '2026-07-24 00:11:38', '2026-07-24 02:14:15'),
(4, 'Sarah M.', 'sarah.m@organization.com', '$2b$12$S/3zE.i7VqG.mRPJtRSi5epE8wgAImBiRdnoxjCbeMQ4v/myCYSPO', 'employee', 3, 'Sales Representative', 'EMP-004', '+1-555-0104', 'Regular', '2022-09-01', '1995-01-18', '321 Elm St', NULL, NULL, 1, '2026-07-24 00:11:38', '2026-07-24 02:14:15'),
(5, 'Tom K.', 'tom.k@organization.com', '$2b$12$S/3zE.i7VqG.mRPJtRSi5epE8wgAImBiRdnoxjCbeMQ4v/myCYSPO', 'employee', 5, 'IT Specialist', 'EMP-005', '+1-555-0105', 'Regular', '2021-02-10', '1992-06-30', '654 Maple Dr', NULL, NULL, 1, '2026-07-24 00:11:38', '2026-07-24 02:14:15'),
(6, 'Lisa W.', 'lisa.w@organization.com', '$2b$12$S/3zE.i7VqG.mRPJtRSi5epE8wgAImBiRdnoxjCbeMQ4v/myCYSPO', 'employee', 4, 'Financial Analyst', 'EMP-006', '+1-555-0106', 'Regular', '2023-01-15', '1993-09-14', '987 Cedar Ln', NULL, '2026-07-27 13:31:17', 1, '2026-07-24 00:11:38', '2026-07-27 13:31:17'),
(7, 'David P.', 'david.p@organization.com', '$2b$12$S/3zE.i7VqG.mRPJtRSi5epE8wgAImBiRdnoxjCbeMQ4v/myCYSPO', 'employee', 1, 'Operations Coordinator', 'EMP-007', '+1-555-0107', 'Probationary', '2024-04-01', '1998-04-25', '147 Birch Way', NULL, NULL, 1, '2026-07-24 00:11:38', '2026-07-24 02:14:16'),
(8, 'Emma L.', 'emma.l@organization.com', '$2b$12$S/3zE.i7VqG.mRPJtRSi5epE8wgAImBiRdnoxjCbeMQ4v/myCYSPO', 'employee', 2, 'HR Assistant', 'EMP-008', '+1-555-0108', 'Regular', '2023-08-15', '1996-12-08', '258 Spruce Ct', NULL, NULL, 1, '2026-07-24 00:11:38', '2026-07-24 02:14:16'),
(17, 'Benneth Aloyon', 'baaloyon@gmail.com', '$2b$12$U7C95.rSOlzzztVNPkxrP.6ywROfBxeVzPT/pkOl6qePryVQOfrkS', 'employee', 3, 'Market Head', NULL, '0974387587', 'Regular', NULL, NULL, 'Surigao CIty', NULL, '2026-07-28 02:41:46', 1, '2026-07-24 06:29:00', '2026-07-28 02:41:46');

-- --------------------------------------------------------

--
-- Table structure for table `user_role_history`
--

CREATE TABLE `user_role_history` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `old_role` varchar(100) DEFAULT NULL,
  `new_role` varchar(100) NOT NULL,
  `old_department_id` int(11) DEFAULT NULL,
  `new_department_id` int(11) DEFAULT NULL,
  `changed_by` int(11) DEFAULT NULL,
  `changed_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_current_sops`
-- (See below for the actual view)
--
CREATE TABLE `vw_current_sops` (
`sop_id` int(11)
,`sop_public_id` char(36)
,`sop_code` varchar(50)
,`title` varchar(255)
,`sop_status` enum('Draft','For Review','Approved','Published','Archived')
,`department_id` int(11)
,`category_id` int(11)
,`owner_id` int(11)
,`version_id` int(11)
,`version_public_id` char(36)
,`version` varchar(20)
,`version_status` enum('Draft','For Review','Approved','Published','Archived')
,`effective_date` date
,`review_date` date
,`published_at` datetime
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_pending_acknowledgements`
-- (See below for the actual view)
--
CREATE TABLE `vw_pending_acknowledgements` (
`acknowledgement_id` int(11)
,`acknowledgement_public_id` char(36)
,`user_id` int(11)
,`status` enum('Pending','Acknowledged','Reopened','Expired')
,`created_at` timestamp
,`version_id` int(11)
,`version` varchar(20)
,`sop_id` int(11)
,`sop_code` varchar(50)
,`title` varchar(255)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_review_due`
-- (See below for the actual view)
--
CREATE TABLE `vw_review_due` (
`version_id` int(11)
,`version` varchar(20)
,`review_date` date
,`sop_id` int(11)
,`sop_code` varchar(50)
,`title` varchar(255)
,`department_id` int(11)
,`owner_id` int(11)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_version_history`
-- (See below for the actual view)
--
CREATE TABLE `vw_version_history` (
`sop_id` int(11)
,`sop_code` varchar(50)
,`version_id` int(11)
,`version` varchar(20)
,`status` enum('Draft','For Review','Approved','Published','Archived')
,`change_summary` text
,`created_by` int(11)
,`created_at` timestamp
,`published_at` datetime
,`archived_at` datetime
);

-- --------------------------------------------------------

--
-- Table structure for table `workflow_actions`
--

CREATE TABLE `workflow_actions` (
  `id` int(11) NOT NULL,
  `workflow_instance_id` int(11) NOT NULL,
  `workflow_step_id` int(11) NOT NULL,
  `actor_id` int(11) NOT NULL,
  `action` enum('Submitted','Approved','Rejected','Delegated','Commented') NOT NULL,
  `comments` text DEFAULT NULL,
  `action_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `workflow_instances`
--

CREATE TABLE `workflow_instances` (
  `id` int(11) NOT NULL,
  `public_id` char(36) NOT NULL DEFAULT uuid(),
  `sop_version_id` int(11) NOT NULL,
  `workflow_id` int(11) NOT NULL,
  `current_step_order` int(11) NOT NULL DEFAULT 1,
  `status` enum('In Progress','Approved','Rejected','Cancelled') NOT NULL DEFAULT 'In Progress',
  `started_at` datetime NOT NULL DEFAULT current_timestamp(),
  `completed_at` datetime DEFAULT NULL,
  `created_by` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `workflow_steps`
--

CREATE TABLE `workflow_steps` (
  `id` int(11) NOT NULL,
  `workflow_id` int(11) NOT NULL,
  `step_order` int(11) NOT NULL,
  `step_name` varchar(150) NOT NULL,
  `approver_type` enum('User','Role','Department') NOT NULL DEFAULT 'Role',
  `approver_reference_id` int(11) DEFAULT NULL,
  `approver_role` varchar(100) DEFAULT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `acknowledgement_history`
--
ALTER TABLE `acknowledgement_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_ackhistory_ack` (`acknowledgement_id`);

--
-- Indexes for table `activities`
--
ALTER TABLE `activities`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_activities_training` (`training_id`);

--
-- Indexes for table `announcements`
--
ALTER TABLE `announcements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `idx_priority` (`priority`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created` (`created_at` DESC);

--
-- Indexes for table `approval_workflows`
--
ALTER TABLE `approval_workflows`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_workflow_public_id` (`public_id`),
  ADD KEY `fk_workflow_department` (`department_id`);

--
-- Indexes for table `arsens`
--
ALTER TABLE `arsens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_arsens_code` (`code`);

--
-- Indexes for table `assignments`
--
ALTER TABLE `assignments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_assignments_course` (`course_id`),
  ADD KEY `idx_assignments_module` (`module_id`);

--
-- Indexes for table `assignment_departments`
--
ALTER TABLE `assignment_departments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_assignment_department` (`assignment_id`,`department_id`),
  ADD KEY `fk_assigndept_department` (`department_id`);

--
-- Indexes for table `assignment_positions`
--
ALTER TABLE `assignment_positions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_assignment_position` (`assignment_id`,`position_name`);

--
-- Indexes for table `assignment_users`
--
ALTER TABLE `assignment_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_assignment_user` (`assignment_id`,`user_id`);

--
-- Indexes for table `attendance`
--
ALTER TABLE `attendance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_attendance` (`training_id`,`reservist_id`),
  ADD KEY `idx_attendance_reservist` (`reservist_id`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_logs_user` (`user_id`),
  ADD KEY `idx_audit_logs_action` (`action`),
  ADD KEY `idx_audit_logs_entity` (`entity_type`,`entity_id`),
  ADD KEY `idx_audit_logs_created` (`created_at`);

--
-- Indexes for table `businesses`
--
ALTER TABLE `businesses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `business_code` (`business_code`),
  ADD KEY `fk_business_created_by` (`created_by`),
  ADD KEY `fk_business_updated_by` (`updated_by`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_categories_public_id` (`public_id`),
  ADD UNIQUE KEY `uq_categories_dept_name` (`department_id`,`name`);

--
-- Indexes for table `content_progress`
--
ALTER TABLE `content_progress`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_content_progress` (`enrollment_id`,`content_id`),
  ADD KEY `content_id` (`content_id`);

--
-- Indexes for table `courses`
--
ALTER TABLE `courses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_courses_status` (`status`),
  ADD KEY `idx_courses_category` (`category`),
  ADD KEY `idx_courses_instructor` (`instructor_id`),
  ADD KEY `idx_courses_deleted` (`is_deleted`);

--
-- Indexes for table `course_enrollments`
--
ALTER TABLE `course_enrollments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_course_enrollment` (`course_id`,`user_id`),
  ADD KEY `idx_enrollments_user` (`user_id`),
  ADD KEY `idx_enrollments_course` (`course_id`),
  ADD KEY `idx_enrollments_status` (`status`);

--
-- Indexes for table `course_modules`
--
ALTER TABLE `course_modules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_course_modules_course` (`course_id`),
  ADD KEY `idx_course_modules_order` (`course_id`,`order_index`);

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_departments_code` (`code`),
  ADD KEY `idx_departments_parent` (`parent_department_id`),
  ADD KEY `idx_departments_head` (`head_user_id`),
  ADD KEY `idx_departments_business` (`business_id`);

--
-- Indexes for table `department_members`
--
ALTER TABLE `department_members`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_dept_member` (`department_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `discussions`
--
ALTER TABLE `discussions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_discussions_course` (`course_id`),
  ADD KEY `idx_discussions_module` (`module_id`);

--
-- Indexes for table `discussion_replies`
--
ALTER TABLE `discussion_replies`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_discussion_replies_discussion` (`discussion_id`),
  ADD KEY `idx_discussion_replies_parent` (`parent_reply_id`);

--
-- Indexes for table `external_trainings`
--
ALTER TABLE `external_trainings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_external_trainings_reservist` (`reservist_id`);

--
-- Indexes for table `external_training_attachments`
--
ALTER TABLE `external_training_attachments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ext_attachments_training` (`external_training_id`);

--
-- Indexes for table `grades`
--
ALTER TABLE `grades`
  ADD PRIMARY KEY (`id`),
  ADD KEY `graded_by` (`graded_by`),
  ADD KEY `idx_grades_user` (`user_id`),
  ADD KEY `idx_grades_course` (`course_id`),
  ADD KEY `idx_grades_item` (`item_id`,`item_type`);

--
-- Indexes for table `groups`
--
ALTER TABLE `groups`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_groups_code` (`code`),
  ADD KEY `idx_groups_arsen` (`arsen_id`);

--
-- Indexes for table `module_content`
--
ALTER TABLE `module_content`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_module_content_module` (`module_id`),
  ADD KEY `idx_module_content_order` (`module_id`,`order_index`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notifications_user` (`user_id`),
  ADD KEY `idx_notifications_read` (`is_read`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_permissions_name` (`name`);

--
-- Indexes for table `quizzes`
--
ALTER TABLE `quizzes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_quizzes_course` (`course_id`),
  ADD KEY `idx_quizzes_module` (`module_id`);

--
-- Indexes for table `quiz_questions`
--
ALTER TABLE `quiz_questions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_quiz_questions_quiz` (`quiz_id`);

--
-- Indexes for table `quiz_submissions`
--
ALTER TABLE `quiz_submissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_quiz_submissions_user` (`user_id`),
  ADD KEY `idx_quiz_submissions_quiz` (`quiz_id`);

--
-- Indexes for table `reports`
--
ALTER TABLE `reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_reports_type` (`type`),
  ADD KEY `idx_reports_generated_by` (`generated_by`);

--
-- Indexes for table `reservists`
--
ALTER TABLE `reservists`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `reservist_assignments`
--
ALTER TABLE `reservist_assignments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_reservist_assignments_reservist` (`reservist_id`),
  ADD KEY `idx_reservist_assignments_squadron` (`squadron_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_roles_name` (`name`);

--
-- Indexes for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_role_perm` (`role_name`,`permission_name`),
  ADD KEY `permission_name` (`permission_name`);

--
-- Indexes for table `schema_migrations`
--
ALTER TABLE `schema_migrations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `filename` (`filename`);

--
-- Indexes for table `sops`
--
ALTER TABLE `sops`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sops_public_id` (`public_id`),
  ADD UNIQUE KEY `uq_sop_code` (`sop_code`),
  ADD KEY `idx_sop_code` (`sop_code`),
  ADD KEY `idx_sop_title` (`title`),
  ADD KEY `idx_sop_department_status` (`department_id`,`status`),
  ADD KEY `idx_sop_category_status` (`category_id`,`status`);

--
-- Indexes for table `sop_acknowledgements`
--
ALTER TABLE `sop_acknowledgements`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_ack_public_id` (`public_id`),
  ADD UNIQUE KEY `uq_ack_version_user` (`sop_version_id`,`user_id`),
  ADD KEY `idx_ack_user_status` (`user_id`,`status`),
  ADD KEY `idx_ack_version_status` (`sop_version_id`,`status`);

--
-- Indexes for table `sop_approvals`
--
ALTER TABLE `sop_approvals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sop_approvals_sop` (`sop_id`),
  ADD KEY `idx_sop_approvals_status` (`status`);

--
-- Indexes for table `sop_assignments`
--
ALTER TABLE `sop_assignments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_assignment_public_id` (`public_id`),
  ADD KEY `fk_assignment_version` (`sop_version_id`);

--
-- Indexes for table `sop_audit_logs`
--
ALTER TABLE `sop_audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_audit_public_id` (`public_id`),
  ADD KEY `idx_sop_audit_entity` (`entity_type`,`entity_id`),
  ADD KEY `idx_sop_audit_actor_time` (`performed_by`,`created_at`);

--
-- Indexes for table `sop_change_logs`
--
ALTER TABLE `sop_change_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_changelog_version` (`sop_version_id`);

--
-- Indexes for table `sop_course_links`
--
ALTER TABLE `sop_course_links`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_courselink_sop` (`sop_id`);

--
-- Indexes for table `sop_documents`
--
ALTER TABLE `sop_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_document_version_type` (`sop_version_id`,`document_type`);

--
-- Indexes for table `sop_sections`
--
ALTER TABLE `sop_sections`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_section_version` (`sop_version_id`),
  ADD KEY `idx_sop_sections_sop` (`sop_id`),
  ADD KEY `idx_sop_sections_order` (`sop_id`,`order_index`);

--
-- Indexes for table `sop_section_files`
--
ALTER TABLE `sop_section_files`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_sectionfile_section` (`section_id`);

--
-- Indexes for table `sop_shares`
--
ALTER TABLE `sop_shares`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sop_shares_sop` (`sop_id`);

--
-- Indexes for table `sop_steps`
--
ALTER TABLE `sop_steps`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_step_version_order` (`sop_version_id`,`sort_order`),
  ADD KEY `idx_step_order` (`sop_version_id`,`sort_order`),
  ADD KEY `idx_sop_steps_sop` (`sop_id`),
  ADD KEY `idx_sop_steps_order` (`sop_id`,`order_index`);

--
-- Indexes for table `sop_step_comments`
--
ALTER TABLE `sop_step_comments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_stepcomment_step` (`step_id`);

--
-- Indexes for table `sop_tags`
--
ALTER TABLE `sop_tags`
  ADD PRIMARY KEY (`sop_id`,`tag_id`),
  ADD KEY `fk_sop_tags_tag` (`tag_id`);

--
-- Indexes for table `sop_versions`
--
ALTER TABLE `sop_versions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sop_versions_public_id` (`public_id`),
  ADD UNIQUE KEY `uq_version_sop_version` (`sop_id`,`version`),
  ADD KEY `idx_version_status` (`status`),
  ADD KEY `idx_version_status_review` (`status`,`review_date`),
  ADD KEY `idx_version_sop_current` (`sop_id`,`is_current`);

--
-- Indexes for table `squadron`
--
ALTER TABLE `squadron`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_squadron_code` (`code`),
  ADD KEY `idx_squadron_group` (`group_id`);

--
-- Indexes for table `squadron_lookup`
--
ALTER TABLE `squadron_lookup`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_squadron_lookup_code` (`squadron_code`);

--
-- Indexes for table `submissions`
--
ALTER TABLE `submissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `graded_by` (`graded_by`),
  ADD KEY `idx_submissions_user` (`user_id`),
  ADD KEY `idx_submissions_assignment` (`assignment_id`),
  ADD KEY `idx_submissions_status` (`status`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`key`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Indexes for table `tags`
--
ALTER TABLE `tags`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_tags_name` (`name`),
  ADD UNIQUE KEY `uq_tags_public_id` (`public_id`);

--
-- Indexes for table `trainings`
--
ALTER TABLE `trainings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_trainings_status` (`status`),
  ADD KEY `idx_trainings_type` (`type`);

--
-- Indexes for table `training_attachments`
--
ALTER TABLE `training_attachments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_training_attachments_training` (`training_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_users_email` (`email`),
  ADD KEY `idx_users_role` (`role`),
  ADD KEY `idx_users_department` (`department_id`),
  ADD KEY `idx_users_active` (`is_active`);

--
-- Indexes for table `user_role_history`
--
ALTER TABLE `user_role_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_role_history_user` (`user_id`);

--
-- Indexes for table `workflow_actions`
--
ALTER TABLE `workflow_actions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_workflowaction_instance` (`workflow_instance_id`),
  ADD KEY `fk_workflowaction_step` (`workflow_step_id`);

--
-- Indexes for table `workflow_instances`
--
ALTER TABLE `workflow_instances`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_workflowinstance_public_id` (`public_id`),
  ADD KEY `fk_workflowinstance_version` (`sop_version_id`),
  ADD KEY `fk_workflowinstance_workflow` (`workflow_id`),
  ADD KEY `idx_workflowinstance_status` (`status`,`current_step_order`);

--
-- Indexes for table `workflow_steps`
--
ALTER TABLE `workflow_steps`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_workflow_step_order` (`workflow_id`,`step_order`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `acknowledgement_history`
--
ALTER TABLE `acknowledgement_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `activities`
--
ALTER TABLE `activities`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `approval_workflows`
--
ALTER TABLE `approval_workflows`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `arsens`
--
ALTER TABLE `arsens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `assignments`
--
ALTER TABLE `assignments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `assignment_departments`
--
ALTER TABLE `assignment_departments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `assignment_positions`
--
ALTER TABLE `assignment_positions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `assignment_users`
--
ALTER TABLE `assignment_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `attendance`
--
ALTER TABLE `attendance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=193;

--
-- AUTO_INCREMENT for table `businesses`
--
ALTER TABLE `businesses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `content_progress`
--
ALTER TABLE `content_progress`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `courses`
--
ALTER TABLE `courses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `course_enrollments`
--
ALTER TABLE `course_enrollments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `course_modules`
--
ALTER TABLE `course_modules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `department_members`
--
ALTER TABLE `department_members`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `discussions`
--
ALTER TABLE `discussions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `discussion_replies`
--
ALTER TABLE `discussion_replies`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `external_trainings`
--
ALTER TABLE `external_trainings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `external_training_attachments`
--
ALTER TABLE `external_training_attachments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `grades`
--
ALTER TABLE `grades`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `groups`
--
ALTER TABLE `groups`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `module_content`
--
ALTER TABLE `module_content`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `quizzes`
--
ALTER TABLE `quizzes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `quiz_questions`
--
ALTER TABLE `quiz_questions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `quiz_submissions`
--
ALTER TABLE `quiz_submissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reports`
--
ALTER TABLE `reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reservists`
--
ALTER TABLE `reservists`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reservist_assignments`
--
ALTER TABLE `reservist_assignments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `role_permissions`
--
ALTER TABLE `role_permissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=47;

--
-- AUTO_INCREMENT for table `schema_migrations`
--
ALTER TABLE `schema_migrations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `sops`
--
ALTER TABLE `sops`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sop_acknowledgements`
--
ALTER TABLE `sop_acknowledgements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sop_approvals`
--
ALTER TABLE `sop_approvals`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sop_assignments`
--
ALTER TABLE `sop_assignments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sop_audit_logs`
--
ALTER TABLE `sop_audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sop_change_logs`
--
ALTER TABLE `sop_change_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `sop_course_links`
--
ALTER TABLE `sop_course_links`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sop_documents`
--
ALTER TABLE `sop_documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `sop_sections`
--
ALTER TABLE `sop_sections`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=95;

--
-- AUTO_INCREMENT for table `sop_section_files`
--
ALTER TABLE `sop_section_files`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sop_shares`
--
ALTER TABLE `sop_shares`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sop_steps`
--
ALTER TABLE `sop_steps`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `sop_step_comments`
--
ALTER TABLE `sop_step_comments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sop_versions`
--
ALTER TABLE `sop_versions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `squadron`
--
ALTER TABLE `squadron`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `squadron_lookup`
--
ALTER TABLE `squadron_lookup`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `submissions`
--
ALTER TABLE `submissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tags`
--
ALTER TABLE `tags`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `trainings`
--
ALTER TABLE `trainings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `training_attachments`
--
ALTER TABLE `training_attachments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `user_role_history`
--
ALTER TABLE `user_role_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `workflow_actions`
--
ALTER TABLE `workflow_actions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `workflow_instances`
--
ALTER TABLE `workflow_instances`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `workflow_steps`
--
ALTER TABLE `workflow_steps`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

-- --------------------------------------------------------

--
-- Structure for view `vw_current_sops`
--
DROP TABLE IF EXISTS `vw_current_sops`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u607968802_sop`@`%` SQL SECURITY DEFINER VIEW `vw_current_sops`  AS SELECT `s`.`id` AS `sop_id`, `s`.`public_id` AS `sop_public_id`, `s`.`sop_code` AS `sop_code`, `s`.`title` AS `title`, `s`.`status` AS `sop_status`, `s`.`department_id` AS `department_id`, `s`.`category_id` AS `category_id`, `s`.`owner_id` AS `owner_id`, `v`.`id` AS `version_id`, `v`.`public_id` AS `version_public_id`, `v`.`version` AS `version`, `v`.`status` AS `version_status`, `v`.`effective_date` AS `effective_date`, `v`.`review_date` AS `review_date`, `v`.`published_at` AS `published_at` FROM (`sops` `s` left join `sop_versions` `v` on(`v`.`id` = `s`.`current_version_id`)) WHERE `s`.`deleted_at` is null ;

-- --------------------------------------------------------

--
-- Structure for view `vw_pending_acknowledgements`
--
DROP TABLE IF EXISTS `vw_pending_acknowledgements`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u607968802_sop`@`%` SQL SECURITY DEFINER VIEW `vw_pending_acknowledgements`  AS SELECT `a`.`id` AS `acknowledgement_id`, `a`.`public_id` AS `acknowledgement_public_id`, `a`.`user_id` AS `user_id`, `a`.`status` AS `status`, `a`.`created_at` AS `created_at`, `v`.`id` AS `version_id`, `v`.`version` AS `version`, `s`.`id` AS `sop_id`, `s`.`sop_code` AS `sop_code`, `s`.`title` AS `title` FROM ((`sop_acknowledgements` `a` join `sop_versions` `v` on(`v`.`id` = `a`.`sop_version_id`)) join `sops` `s` on(`s`.`id` = `v`.`sop_id`)) WHERE `a`.`status` in ('Pending','Reopened') ;

-- --------------------------------------------------------

--
-- Structure for view `vw_review_due`
--
DROP TABLE IF EXISTS `vw_review_due`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u607968802_sop`@`%` SQL SECURITY DEFINER VIEW `vw_review_due`  AS SELECT `v`.`id` AS `version_id`, `v`.`version` AS `version`, `v`.`review_date` AS `review_date`, `s`.`id` AS `sop_id`, `s`.`sop_code` AS `sop_code`, `s`.`title` AS `title`, `s`.`department_id` AS `department_id`, `s`.`owner_id` AS `owner_id` FROM (`sop_versions` `v` join `sops` `s` on(`s`.`id` = `v`.`sop_id`)) WHERE `v`.`status` = 'Published' AND `v`.`review_date` is not null AND `v`.`review_date` <= curdate() AND `v`.`deleted_at` is null ;

-- --------------------------------------------------------

--
-- Structure for view `vw_version_history`
--
DROP TABLE IF EXISTS `vw_version_history`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u607968802_sop`@`%` SQL SECURITY DEFINER VIEW `vw_version_history`  AS SELECT `s`.`id` AS `sop_id`, `s`.`sop_code` AS `sop_code`, `v`.`id` AS `version_id`, `v`.`version` AS `version`, `v`.`status` AS `status`, `v`.`change_summary` AS `change_summary`, `v`.`created_by` AS `created_by`, `v`.`created_at` AS `created_at`, `v`.`published_at` AS `published_at`, `v`.`archived_at` AS `archived_at` FROM (`sop_versions` `v` join `sops` `s` on(`s`.`id` = `v`.`sop_id`)) ORDER BY `s`.`id` ASC, `v`.`created_at` ASC ;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `acknowledgement_history`
--
ALTER TABLE `acknowledgement_history`
  ADD CONSTRAINT `fk_ackhistory_ack` FOREIGN KEY (`acknowledgement_id`) REFERENCES `sop_acknowledgements` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `approval_workflows`
--
ALTER TABLE `approval_workflows`
  ADD CONSTRAINT `fk_workflow_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `assignments`
--
ALTER TABLE `assignments`
  ADD CONSTRAINT `assignments_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `assignments_ibfk_2` FOREIGN KEY (`module_id`) REFERENCES `course_modules` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `assignment_departments`
--
ALTER TABLE `assignment_departments`
  ADD CONSTRAINT `fk_assigndept_assignment` FOREIGN KEY (`assignment_id`) REFERENCES `sop_assignments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_assigndept_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `assignment_positions`
--
ALTER TABLE `assignment_positions`
  ADD CONSTRAINT `fk_assignpos_assignment` FOREIGN KEY (`assignment_id`) REFERENCES `sop_assignments` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `assignment_users`
--
ALTER TABLE `assignment_users`
  ADD CONSTRAINT `fk_assignuser_assignment` FOREIGN KEY (`assignment_id`) REFERENCES `sop_assignments` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `businesses`
--
ALTER TABLE `businesses`
  ADD CONSTRAINT `fk_business_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_business_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `categories`
--
ALTER TABLE `categories`
  ADD CONSTRAINT `fk_category_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `content_progress`
--
ALTER TABLE `content_progress`
  ADD CONSTRAINT `content_progress_ibfk_1` FOREIGN KEY (`enrollment_id`) REFERENCES `course_enrollments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `content_progress_ibfk_2` FOREIGN KEY (`content_id`) REFERENCES `module_content` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `courses`
--
ALTER TABLE `courses`
  ADD CONSTRAINT `courses_ibfk_1` FOREIGN KEY (`instructor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `course_enrollments`
--
ALTER TABLE `course_enrollments`
  ADD CONSTRAINT `course_enrollments_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `course_enrollments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `course_modules`
--
ALTER TABLE `course_modules`
  ADD CONSTRAINT `course_modules_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `departments`
--
ALTER TABLE `departments`
  ADD CONSTRAINT `departments_ibfk_1` FOREIGN KEY (`parent_department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `departments_ibfk_2` FOREIGN KEY (`head_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_department_business` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `department_members`
--
ALTER TABLE `department_members`
  ADD CONSTRAINT `department_members_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `department_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `discussions`
--
ALTER TABLE `discussions`
  ADD CONSTRAINT `discussions_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `discussions_ibfk_2` FOREIGN KEY (`module_id`) REFERENCES `course_modules` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `discussions_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `discussion_replies`
--
ALTER TABLE `discussion_replies`
  ADD CONSTRAINT `discussion_replies_ibfk_1` FOREIGN KEY (`discussion_id`) REFERENCES `discussions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `discussion_replies_ibfk_2` FOREIGN KEY (`parent_reply_id`) REFERENCES `discussion_replies` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `discussion_replies_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `grades`
--
ALTER TABLE `grades`
  ADD CONSTRAINT `grades_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `grades_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `grades_ibfk_3` FOREIGN KEY (`graded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `module_content`
--
ALTER TABLE `module_content`
  ADD CONSTRAINT `module_content_ibfk_1` FOREIGN KEY (`module_id`) REFERENCES `course_modules` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `quizzes`
--
ALTER TABLE `quizzes`
  ADD CONSTRAINT `quizzes_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `quizzes_ibfk_2` FOREIGN KEY (`module_id`) REFERENCES `course_modules` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `quiz_questions`
--
ALTER TABLE `quiz_questions`
  ADD CONSTRAINT `quiz_questions_ibfk_1` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `quiz_submissions`
--
ALTER TABLE `quiz_submissions`
  ADD CONSTRAINT `quiz_submissions_ibfk_1` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `quiz_submissions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_name`) REFERENCES `roles` (`name`) ON DELETE CASCADE,
  ADD CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_name`) REFERENCES `permissions` (`name`) ON DELETE CASCADE;

--
-- Constraints for table `sops`
--
ALTER TABLE `sops`
  ADD CONSTRAINT `fk_sop_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_sop_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`);

--
-- Constraints for table `sop_acknowledgements`
--
ALTER TABLE `sop_acknowledgements`
  ADD CONSTRAINT `fk_ack_version` FOREIGN KEY (`sop_version_id`) REFERENCES `sop_versions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sop_approvals`
--
ALTER TABLE `sop_approvals`
  ADD CONSTRAINT `sop_approvals_ibfk_1` FOREIGN KEY (`sop_id`) REFERENCES `sops` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sop_assignments`
--
ALTER TABLE `sop_assignments`
  ADD CONSTRAINT `fk_assignment_version` FOREIGN KEY (`sop_version_id`) REFERENCES `sop_versions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sop_change_logs`
--
ALTER TABLE `sop_change_logs`
  ADD CONSTRAINT `fk_changelog_version` FOREIGN KEY (`sop_version_id`) REFERENCES `sop_versions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sop_course_links`
--
ALTER TABLE `sop_course_links`
  ADD CONSTRAINT `fk_courselink_sop` FOREIGN KEY (`sop_id`) REFERENCES `sops` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sop_documents`
--
ALTER TABLE `sop_documents`
  ADD CONSTRAINT `fk_document_version` FOREIGN KEY (`sop_version_id`) REFERENCES `sop_versions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sop_section_files`
--
ALTER TABLE `sop_section_files`
  ADD CONSTRAINT `fk_sectionfile_section` FOREIGN KEY (`section_id`) REFERENCES `sop_sections` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sop_shares`
--
ALTER TABLE `sop_shares`
  ADD CONSTRAINT `sop_shares_ibfk_1` FOREIGN KEY (`sop_id`) REFERENCES `sops` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sop_step_comments`
--
ALTER TABLE `sop_step_comments`
  ADD CONSTRAINT `fk_stepcomment_step` FOREIGN KEY (`step_id`) REFERENCES `sop_steps` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sop_tags`
--
ALTER TABLE `sop_tags`
  ADD CONSTRAINT `fk_sop_tags_sop` FOREIGN KEY (`sop_id`) REFERENCES `sops` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sop_tags_tag` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sop_versions`
--
ALTER TABLE `sop_versions`
  ADD CONSTRAINT `fk_version_sop` FOREIGN KEY (`sop_id`) REFERENCES `sops` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `submissions`
--
ALTER TABLE `submissions`
  ADD CONSTRAINT `submissions_ibfk_1` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `submissions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `submissions_ibfk_3` FOREIGN KEY (`graded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD CONSTRAINT `system_settings_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `user_role_history`
--
ALTER TABLE `user_role_history`
  ADD CONSTRAINT `user_role_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `workflow_actions`
--
ALTER TABLE `workflow_actions`
  ADD CONSTRAINT `fk_workflowaction_instance` FOREIGN KEY (`workflow_instance_id`) REFERENCES `workflow_instances` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_workflowaction_step` FOREIGN KEY (`workflow_step_id`) REFERENCES `workflow_steps` (`id`);

--
-- Constraints for table `workflow_instances`
--
ALTER TABLE `workflow_instances`
  ADD CONSTRAINT `fk_workflowinstance_version` FOREIGN KEY (`sop_version_id`) REFERENCES `sop_versions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_workflowinstance_workflow` FOREIGN KEY (`workflow_id`) REFERENCES `approval_workflows` (`id`);

--
-- Constraints for table `workflow_steps`
--
ALTER TABLE `workflow_steps`
  ADD CONSTRAINT `fk_workflowstep_workflow` FOREIGN KEY (`workflow_id`) REFERENCES `approval_workflows` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

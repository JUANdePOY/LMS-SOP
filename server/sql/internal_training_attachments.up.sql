-- Internal (PAFR) training file metadata. Bytes under uploads/trainings/{id}/.
CREATE TABLE IF NOT EXISTS `internal_training_attachments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `training_id` bigint NOT NULL,
  `kind` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'letter_order',
  `stored_filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_filename` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(127) COLLATE utf8mb4_unicode_ci NOT NULL,
  `size_bytes` bigint UNSIGNED NOT NULL,
  `storage_backend` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'local',
  `relative_path` varchar(1024) COLLATE utf8mb4_unicode_ci NOT NULL,
  `uploaded_by` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_internal_training_kind` (`training_id`,`kind`),
  KEY `idx_internal_training_created` (`training_id`,`created_at`),
  CONSTRAINT `internal_training_attachments_ibfk_1` FOREIGN KEY (`training_id`) REFERENCES `trainings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

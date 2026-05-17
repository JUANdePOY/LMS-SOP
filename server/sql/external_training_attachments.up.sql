-- External training file metadata. Bytes under uploads/external-trainings/{id}/.
CREATE TABLE IF NOT EXISTS `external_training_attachments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `external_training_id` int UNSIGNED NOT NULL,
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
  KEY `idx_external_training_kind` (`external_training_id`,`kind`),
  KEY `idx_external_training_created` (`external_training_id`,`created_at`),
  CONSTRAINT `external_training_attachments_ibfk_1` FOREIGN KEY (`external_training_id`) REFERENCES `external_trainings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

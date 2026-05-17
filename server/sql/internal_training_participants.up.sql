-- Targeted reservists for internal (PAFR) trainings.
-- No FKs to trainings/reservists/squadron: some deployments use MyISAM for `trainings`.
-- Integrity enforced in application code.

CREATE TABLE IF NOT EXISTS `internal_training_participants` (
  `training_id` bigint NOT NULL,
  `reservist_id` bigint NOT NULL,
  `squadron_id` bigint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`training_id`,`reservist_id`),
  KEY `idx_itp_training_squadron` (`training_id`,`squadron_id`),
  KEY `idx_itp_squadron` (`squadron_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

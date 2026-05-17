-- One-time: legacy `training_attachments` -> `internal_training_attachments`.
-- Run after backup. Skip if already renamed.

RENAME TABLE `training_attachments` TO `internal_training_attachments`;

ALTER TABLE `internal_training_attachments` DROP FOREIGN KEY `training_attachments_ibfk_1`;

ALTER TABLE `internal_training_attachments`
  ADD CONSTRAINT `internal_training_attachments_ibfk_1`
  FOREIGN KEY (`training_id`) REFERENCES `trainings` (`id`) ON DELETE CASCADE;

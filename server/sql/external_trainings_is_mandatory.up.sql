-- Run once on existing databases that already have external_trainings.
ALTER TABLE `external_trainings`
  ADD COLUMN `is_mandatory` tinyint(1) NOT NULL DEFAULT '0' AFTER `capacity`;

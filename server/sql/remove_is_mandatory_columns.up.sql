-- Drop mandatory flags (replaced by UX: no training / activity mandatory toggles).
-- Run on existing databases after backup.

ALTER TABLE `trainings` DROP COLUMN `is_mandatory`;
ALTER TABLE `external_trainings` DROP COLUMN `is_mandatory`;
ALTER TABLE `activities` DROP COLUMN `is_mandatory`;

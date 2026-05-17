-- Run once on existing databases that already have external_trainings.
-- Adds is_mandatory to external_trainings (legacy).
-- Column is removed by remove_is_mandatory_columns.up.sql; fresh installs use pafr.sql without this column.

ALTER TABLE `external_trainings`
  ADD COLUMN `is_mandatory` tinyint(1) NOT NULL DEFAULT '0' AFTER `capacity`;

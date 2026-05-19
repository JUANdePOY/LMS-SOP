-- Adds squadron_limits JSON column to external_trainings
-- Stores an array of objects: [{"squadron_id": 123, "slot_limit": 10}, ...]

ALTER TABLE `external_trainings`
  ADD COLUMN `squadron_limits` json DEFAULT NULL COMMENT 'Per-squadron slot limits (array of {squadron_id, slot_limit})' AFTER `capacity`;

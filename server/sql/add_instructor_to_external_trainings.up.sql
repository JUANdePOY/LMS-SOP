-- Adds instructor/facilitator name to external_trainings

ALTER TABLE `external_trainings`
  ADD COLUMN `instructor` varchar(200) DEFAULT NULL COMMENT 'Facilitator or instructor name' AFTER `capacity`;

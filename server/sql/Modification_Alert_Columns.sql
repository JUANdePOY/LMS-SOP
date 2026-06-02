-- Allow system-generated alerts
ALTER TABLE alerts MODIFY COLUMN created_by BIGINT NULL;

-- Columns for alert type + idempotency key
ALTER TABLE alerts ADD COLUMN alert_type VARCHAR(50) NULL DEFAULT NULL AFTER message;
ALTER TABLE alerts ADD COLUMN entity_type VARCHAR(50) NULL DEFAULT NULL AFTER alert_type;
ALTER TABLE alerts ADD COLUMN entity_id  VARCHAR(100) NULL DEFAULT NULL AFTER entity_type;
ALTER TABLE alerts ADD INDEX idx_entity (entity_type, entity_id);
-- 007_alerts_system.sql
-- System-generated alerts and alert rules for the Alerts & Insights page

USE pafr;

-- Alert rules: define what conditions trigger system-generated alerts
CREATE TABLE IF NOT EXISTS alert_rules (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  type VARCHAR(50) NOT NULL COMMENT 'readiness_low, readiness_drop, no_training, low_attendance, supply_low, supply_overdue, profile_incomplete, no_assessment',
  name VARCHAR(200) NOT NULL,
  description TEXT,
  severity ENUM('critical', 'warning', 'info') NOT NULL DEFAULT 'warning',
  threshold DECIMAL(10,2) NULL COMMENT 'Numeric threshold for triggering (e.g., 60 for readiness < 60)',
  lookback_days INT NULL COMMENT 'Number of days to look back (e.g., 90 for no training in 90 days)',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- System-generated alerts: instances fired from alert rules
CREATE TABLE IF NOT EXISTS system_alerts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  rule_id BIGINT NULL COMMENT 'FK to alert_rules, NULL for ad-hoc',
  alert_type ENUM('readiness_low', 'readiness_drop', 'no_training', 'low_attendance', 'supply_low', 'supply_overdue', 'profile_incomplete', 'no_assessment', 'training_upcoming', 'custom') NOT NULL,
  severity ENUM('critical', 'warning', 'info') NOT NULL DEFAULT 'warning',
  title VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  entity_type VARCHAR(50) NULL COMMENT 'squadron, reservist, supply, training, issuance',
  entity_id BIGINT NULL COMMENT 'ID of the entity this alert is about',
  entity_name VARCHAR(500) NULL COMMENT 'Denormalized name for display',
  squadron_id BIGINT NULL,
  group_id BIGINT NULL,
  arsen_id BIGINT NULL,
  is_acknowledged TINYINT(1) NOT NULL DEFAULT 0,
  acknowledged_by BIGINT NULL,
  acknowledged_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_alert_type (alert_type),
  INDEX idx_severity (severity),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_squadron (squadron_id),
  INDEX idx_group (group_id),
  INDEX idx_arsen (arsen_id),
  INDEX idx_created (created_at),
  INDEX idx_acknowledged (is_acknowledged),
  FOREIGN KEY (rule_id) REFERENCES alert_rules(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Seed default alert rules
INSERT INTO alert_rules (type, name, description, severity, threshold, lookback_days) VALUES
  ('readiness_low', 'Low Squadron Readiness', 'Fires when a squadron average readiness score falls below threshold', 'critical', 60.00, NULL),
  ('readiness_drop', 'Readiness Score Drop', 'Fires when a squadron readiness drops by more than threshold % compared to previous period', 'warning', 10.00, NULL),
  ('no_training', 'No Training Attendance', 'Fires for reservists who have not attended any training in the lookback period', 'warning', NULL, 90),
  ('low_attendance', 'Low Attendance Rate', 'Fires when squadron attendance rate falls below threshold', 'warning', 70.00, NULL),
  ('supply_low', 'Low Supply Stock', 'Fires when supply quantity falls to or below reorder level', 'warning', NULL, NULL),
  ('supply_overdue', 'Overdue Supply Return', 'Fires when supply issuances are past their due return date', 'critical', NULL, NULL),
  ('no_assessment', 'No Readiness Assessment', 'Fires when a squadron has no readiness assessment recorded in the lookback period', 'warning', NULL, 180),
  ('training_upcoming', 'Upcoming Training Reminder', 'Fires 48 hours before a training starts', 'info', NULL, 2)
ON DUPLICATE KEY UPDATE name = name;

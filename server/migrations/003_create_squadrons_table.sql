-- ============================================================
-- Migration: 003_create_squadrons_table.sql
-- Description: Creates the squadrons table (belongs to a Group)
-- ============================================================

CREATE TABLE IF NOT EXISTS squadrons (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  group_id        INT UNSIGNED    NOT NULL,
  name            VARCHAR(100)    NOT NULL COMMENT 'Location-based: Butuan, Surigao, Cagayan etc.',
  code            VARCHAR(50)     NOT NULL COMMENT 'e.g. BTN-SQ, SRG-SQ',
  location        VARCHAR(255)    DEFAULT NULL COMMENT 'e.g. Butuan City, Agusan del Norte',
  specialization  ENUM(
                    'Security',
                    'Engineering',
                    'Communications',
                    'Medical',
                    'Supply',
                    'Transport',
                    'Maintenance',
                    'Air Defense',
                    'Radar Ops',
                    'Intelligence',
                    'Surveillance',
                    'Cyber',
                    'Dental',
                    'Nursing',
                    'Administrative'
                  )               NOT NULL DEFAULT 'Security',
  status          ENUM('active','standby') NOT NULL DEFAULT 'active',
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_squadrons_code (code),
  INDEX idx_squadrons_group_id       (group_id),
  INDEX idx_squadrons_status         (status),
  INDEX idx_squadrons_specialization (specialization),

  CONSTRAINT fk_squadrons_group
    FOREIGN KEY (group_id)
    REFERENCES `groups` (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Squadrons under a Group — location-based';

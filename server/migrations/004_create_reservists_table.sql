-- ============================================================
-- Migration: 004_create_reservists_table.sql
-- Description: Creates the reservists table (belongs to a Squadron)
-- ============================================================

CREATE TABLE IF NOT EXISTS reservists (
  id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  squadron_id         INT UNSIGNED    NOT NULL,

  -- Identity
  serial_no           VARCHAR(50)     NOT NULL UNIQUE COMMENT 'e.g. PAF-001-2019',
  first_name          VARCHAR(100)    NOT NULL,
  last_name           VARCHAR(100)    NOT NULL,
  date_of_birth       DATE            DEFAULT NULL,
  gender              ENUM('Male','Female','Other') DEFAULT NULL,

  -- Military info
  `rank`              ENUM(
                        'Private',
                        'Private First Class',
                        'Corporal',
                        'Sergeant',
                        'Staff Sergeant',
                        'Technical Sergeant',
                        'Master Sergeant',
                        'Second Lieutenant',
                        'First Lieutenant',
                        'Captain',
                        'Major'
                      ) NOT NULL DEFAULT 'Private',

  specialization      ENUM(
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
                      ) NOT NULL DEFAULT 'Security',

  date_enlisted       DATE            DEFAULT NULL,
  status              ENUM('active','standby') NOT NULL DEFAULT 'active',

  -- Civil info
  civil_occupation    VARCHAR(150)    DEFAULT NULL,
  contact_no          VARCHAR(20)     DEFAULT NULL,
  address             VARCHAR(255)    DEFAULT NULL,

  -- Performance metrics
  attendance_rate     DECIMAL(5,2)    NOT NULL DEFAULT 0.00 COMMENT '0.00 - 100.00',
  trainings_completed SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  readiness_score     DECIMAL(5,2)    NOT NULL DEFAULT 0.00 COMMENT '0.00 - 100.00',

  -- Timestamps
  created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE  KEY uq_reservists_serial_no     (serial_no),
  INDEX       idx_reservists_squadron_id  (squadron_id),
  INDEX       idx_reservists_status       (status),
  INDEX       idx_reservists_rank         (`rank`),
  INDEX       idx_reservists_last_name    (last_name),
  INDEX       idx_reservists_specialization (specialization),

  CONSTRAINT fk_reservists_squadron
    FOREIGN KEY (squadron_id)
    REFERENCES  squadrons (id)
    ON UPDATE   CASCADE
    ON DELETE   RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='PAF reservist personnel records';

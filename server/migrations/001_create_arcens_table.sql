-- ============================================================
-- Migration: 001_create_arcens_table.sql
-- Description: Creates the arcens table
-- ============================================================

CREATE TABLE IF NOT EXISTS arcens (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)    NOT NULL COMMENT 'e.g. 1st ARCEN',
  full_name     VARCHAR(200)    NOT NULL COMMENT 'e.g. 1st Air Reserve Center',
  code          VARCHAR(50)     NOT NULL UNIQUE COMMENT 'e.g. 1ARCEN',
  commander     VARCHAR(150)    DEFAULT NULL,
  location      VARCHAR(255)    DEFAULT NULL,
  status        ENUM('active','standby') NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_arcens_status (status),
  INDEX idx_arcens_code   (code)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Air Reserve Centers';

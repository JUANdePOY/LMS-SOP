-- ============================================================
-- Migration: 005_create_migrations_tracker.sql
-- Description: Tracks which migrations have been run
-- Run this FIRST before any other migration
-- ============================================================

CREATE TABLE IF NOT EXISTS migrations (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  filename    VARCHAR(255)  NOT NULL UNIQUE COMMENT 'e.g. 001_create_arcens_table.sql',
  run_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Tracks executed database migrations';

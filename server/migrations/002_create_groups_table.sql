-- ============================================================
-- Migration: 002_create_groups_table.sql
-- Description: Creates the groups table (belongs to an ARCEN)
-- ============================================================

CREATE TABLE IF NOT EXISTS `groups` (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  arcen_id      INT UNSIGNED    NOT NULL,
  name          VARCHAR(100)    NOT NULL COMMENT 'e.g. 509, TOGR 10',
  code          VARCHAR(50)     NOT NULL COMMENT 'e.g. 509RG, TOGR10',
  type          ENUM(
                  'Combat Support',
                  'Logistics',
                  'Air Defense',
                  'Intelligence',
                  'Medical'
                )               NOT NULL DEFAULT 'Combat Support',
  commander     VARCHAR(150)    DEFAULT NULL,
  status        ENUM('active','standby') NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_groups_code (code),
  INDEX idx_groups_arcen_id (arcen_id),
  INDEX idx_groups_status   (status),

  CONSTRAINT fk_groups_arcen
    FOREIGN KEY (arcen_id)
    REFERENCES arcens (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Reserve groups under an ARCEN';

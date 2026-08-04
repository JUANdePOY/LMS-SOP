-- ============================================================================
-- Migration: Add token and expires_at columns to sop_shares
-- Phase: SOP Link Sharing Feature
-- Date: 2026-08-05
-- ============================================================================

ALTER TABLE sop_shares
  ADD COLUMN token VARCHAR(64) NULL UNIQUE AFTER share_type,
  ADD COLUMN expires_at DATETIME NULL AFTER permissions;

-- Index to speed up token-based lookups
CREATE INDEX idx_sop_shares_token ON sop_shares(token);

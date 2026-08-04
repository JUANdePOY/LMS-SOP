-- ============================================================================
-- Migration: Add SOP restriction_type support
-- Phase: Phase 2 SOP Restrictions
-- Date: 2026-08-04
-- ============================================================================

-- Add restriction_type column to sops
-- Values:
--   'public'    - All authenticated users can view
--   'department' - Only users in the same department can view
--   'assigned'  - Only explicitly assigned users can view
--   'private'   - Only owner and admins can view
ALTER TABLE sops
  ADD COLUMN restriction_type ENUM('public','department','assigned','private')
    NOT NULL DEFAULT 'department'
  AFTER department_id;

-- Index to speed up restriction-based filtering
CREATE INDEX idx_sops_restriction_type ON sops(restriction_type);

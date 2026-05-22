-- Migration 008: Add position column to reservists table
ALTER TABLE reservists ADD COLUMN position VARCHAR(200) NULL AFTER rank_date_appointment;

-- Add index for position if needed for searches
ALTER TABLE reservists ADD INDEX idx_position (position);
-- Migration: Add latitude/longitude columns to squadron table
-- for interactive map support

USE pafr;

ALTER TABLE squadron
  ADD COLUMN latitude DECIMAL(10, 7) NULL AFTER location,
  ADD COLUMN longitude DECIMAL(10, 7) NULL AFTER latitude;

-- Update squadrons with real Mindanao coordinates
-- ARSEN-2 (Eastern Mindanao Command) squadrons
UPDATE squadron SET latitude = 7.0707, longitude = 125.6087 WHERE id = 10;  -- Camp Panacan, Davao City (Juliet)
UPDATE squadron SET latitude = 7.0707, longitude = 125.6087 WHERE id = 11;  -- Camp Panacan, Davao City (Kilo)
UPDATE squadron SET latitude = 8.2854, longitude = 124.2822 WHERE id = 12;  -- Camp Evangelista, CDO (Lima)
UPDATE squadron SET latitude = 8.2854, longitude = 124.2822 WHERE id = 13;  -- Camp Evangelista, CDO (Mike)

-- ARSEN-3 (Western Command) - Cebu/Lapu-Lapu squadrons
UPDATE squadron SET latitude = 10.3157, longitude = 123.8854 WHERE id = 14; -- Camp Lapu-Lapu, Cebu (November)
UPDATE squadron SET latitude = 10.3157, longitude = 123.8854 WHERE id = 15; -- Camp Lapu-Lapu, Cebu (Oscar)
UPDATE squadron SET latitude = 10.3157, longitude = 123.8854 WHERE id = 20; -- Camp Lapu-Lapu South (Tango)
UPDATE squadron SET latitude = 10.3157, longitude = 123.8854 WHERE id = 21; -- Camp Lapu-Lapu South (Uniform)

-- Also add coordinates for non-Mindanao squadrons for completeness
-- NCR / Luzon
UPDATE squadron SET latitude = 14.6167, longitude = 121.0500 WHERE id = 1;  -- Camp Aguinaldo (Alpha)
UPDATE squadron SET latitude = 14.6167, longitude = 121.0500 WHERE id = 2;  -- Camp Aguinaldo (Bravo)
UPDATE squadron SET latitude = 14.9667, longitude = 120.5167 WHERE id = 3;  -- Camp Tecson, Bulacan (Charlie)
UPDATE squadron SET latitude = 14.6167, longitude = 121.0500 WHERE id = 4;  -- Camp Aguinaldo (Delta)
UPDATE squadron SET latitude = 14.9667, longitude = 120.5167 WHERE id = 5;  -- Camp Tecson, Bulacan (Echo)
UPDATE squadron SET latitude = 10.3157, longitude = 123.8854 WHERE id = 6;  -- Camp Lapu-Lapu (Foxtrot)
UPDATE squadron SET latitude = 10.3157, longitude = 123.8854 WHERE id = 7;  -- Camp Lapu-Lapu (Golf)
UPDATE squadron SET latitude = 14.8667, longitude = 119.9333 WHERE id = 8;  -- Camp Olongapo (Hotel)
UPDATE squadron SET latitude = 14.8667, longitude = 119.9330 WHERE id = 9;  -- Camp Olongapo (India)
UPDATE squadron SET latitude = 14.3000, longitude = 121.0500 WHERE id = 18; -- Camp Quirino (Romeo)
UPDATE squadron SET latitude = 14.3000, longitude = 121.0500 WHERE id = 19; -- Camp Quirino (Sierra)
UPDATE squadron SET latitude = 16.4167, longitude = 120.5830 WHERE id = 22; -- Camp Dau (Victor)
UPDATE squadron SET latitude = 16.4167, longitude = 120.5830 WHERE id = 23; -- Camp Dau (Whiskey)
UPDATE squadron SET latitude = 17.5667, longitude = 120.3830 WHERE id = 24; -- Camp Tomas K. Confesor (X-Ray)
UPDATE squadron SET latitude = 17.5667, longitude = 120.3830 WHERE id = 25; -- Camp Tomas K. Confesor (Yankee)

-- Eldridge (Zamboanga area approximation)
UPDATE squadron SET latitude = 6.9000, longitude = 122.0667 WHERE id = 16; -- Camp Eldridge (Papa)
UPDATE squadron SET latitude = 6.9000, longitude = 122.0667 WHERE id = 17; -- Camp Eldridge (Quebec)

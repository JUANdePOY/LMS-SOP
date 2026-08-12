-- Fix user_calendar_tokens table schema
-- Resolves: HA_ERR_AUTOINC_ERANGE on INSERT INTO user_calendar_tokens
-- Root cause: the id column type is too small for MySQL's auto-increment range.

-- 1. Widen the id column so auto-increment can advance safely.
--    BIGINT gives a practical range far beyond what this table needs.
ALTER TABLE user_calendar_tokens
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT;

-- 2. Reset auto-increment to a clean baseline so the next insert starts from 1
--    (or from MAX(id)+1 if rows already exist).
SET @next_id = (SELECT IFNULL(MAX(id), 0) + 1 FROM user_calendar_tokens);
ALTER TABLE user_calendar_tokens AUTO_INCREMENT = @next_id;

-- 3. Ensure (user_id, provider) is unique so ON DUPLICATE KEY UPDATE can work
--    as the intended deduplication mechanism.
CREATE UNIQUE INDEX IF NOT EXISTS uk_user_calendar_tokens_provider
  ON user_calendar_tokens (user_id, provider);

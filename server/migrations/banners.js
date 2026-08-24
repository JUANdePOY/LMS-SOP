const db = require('../config/database');

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS banners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT DEFAULT NULL,
    type ENUM('announcement','alert','event','achievement','new_course','new_sop','onboarding','promo') NOT NULL DEFAULT 'announcement',
    cta_label VARCHAR(100) DEFAULT NULL,
    cta_link VARCHAR(500) DEFAULT NULL,
    image_url VARCHAR(500) DEFAULT NULL,
    priority INT NOT NULL DEFAULT 0,
    status ENUM('draft','active','paused','archived') NOT NULL DEFAULT 'draft',
    start_at DATETIME DEFAULT NULL,
    end_at DATETIME DEFAULT NULL,
    audience ENUM('all','role','department','user') NOT NULL DEFAULT 'all',
    target_roles JSON DEFAULT NULL,
    target_departments JSON DEFAULT NULL,
    target_user_ids JSON DEFAULT NULL,
    created_by INT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_banners_status (status),
    INDEX idx_banners_window (start_at, end_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS banner_impressions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    banner_id INT NOT NULL,
    user_id INT NOT NULL,
    event ENUM('impression','click','dismiss','snooze') NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (banner_id) REFERENCES banners(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_banner_impressions_banner (banner_id),
    INDEX idx_banner_impressions_user (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS banner_dismissals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    banner_id INT NOT NULL,
    user_id INT NOT NULL,
    dismissed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    snooze_until DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (banner_id) REFERENCES banners(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_banner_dismissal (banner_id, user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority TINYINT NOT NULL DEFAULT 0 AFTER is_read`,
  `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'system' AFTER priority`,
  `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) DEFAULT NULL AFTER link`,
  `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS scheduled_at DATETIME DEFAULT NULL AFTER image_url`,
  `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at DATETIME DEFAULT NULL AFTER scheduled_at`,
  `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at DATETIME DEFAULT NULL AFTER expires_at`,
  `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_label VARCHAR(100) DEFAULT NULL AFTER read_at`,
  `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url VARCHAR(500) DEFAULT NULL AFTER action_label`,
  `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sound_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER action_url`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user_read_priority ON notifications(user_id, is_read, priority)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user_category ON notifications(user_id, category)`,

  `CREATE TABLE IF NOT EXISTS user_notification_preferences (
    user_id INT NOT NULL PRIMARY KEY,
    categories JSON NOT NULL,
    channels JSON NOT NULL,
    quiet_hours_enabled TINYINT(1) NOT NULL DEFAULT 0,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '07:00:00',
    timezone VARCHAR(64) DEFAULT 'UTC',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

const DEFAULT_CATEGORIES = ['system', 'social', 'training', 'security', 'marketing'];
const DEFAULT_CHANNELS = { in_app: true, push: true, email: false, sound: true };

async function runBannerMigrations() {
  for (const sql of MIGRATIONS) {
    if (!sql || !sql.trim()) continue;
    try {
      await db.query(sql);
    } catch (err) {
      const ignoreCodes = [
        'ER_DUP_COLUMN', 'ER_TABLE_EXISTS_ERROR', 'ER_DUP_KEYNAME',
        1060, 1050, 1061, 121,
      ];
      if (ignoreCodes.includes(err.code) || ignoreCodes.includes(err.errno)) {
        continue;
      }
      console.error('Banner migration error:', err.message);
    }
  }
  console.log('Banner & notification preference migrations applied');
}

module.exports = {
  runBannerMigrations,
  DEFAULT_CATEGORIES,
  DEFAULT_CHANNELS,
};

require('dotenv').config();
const fs = require('fs');
const db = require('./config/database');

async function runMigration() {
  try {
    const sql = fs.readFileSync('./sql/007_alerts_system.sql', 'utf8');
    // Remove USE statement as we're already in the database
    const statements = sql.split(/;/g).filter(s => s.trim() && !s.trim().startsWith('USE'));
    
    for (const stmt of statements) {
      if (stmt.trim()) {
        console.log('Running:', stmt.substring(0, 50) + '...');
        await db.query(stmt);
      }
    }
    console.log('Migration completed successfully');
  } catch (e) {
    console.error('Migration error:', e.message);
  }
}
runMigration();
const db = require('../config/database');
const bcrypt = require('bcrypt');

async function checkPassword() {
  try {
    const [rows] = await db.query(`SELECT u.id, u.password_hash FROM users u WHERE u.email = ?`, ['ADMIN-001']);
    if (rows.length > 0) {
      const user = rows[0];
      console.log('User ID:', user.id);
      console.log('Password hash prefix:', user.password_hash.substring(0, 10));
      
      // Test bcrypt
      const testPassword = 'AdminPass123!';
      const match = await bcrypt.compare(testPassword, user.password_hash);
      console.log('Password match:', match);
    } else {
      console.log('User not found');
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

checkPassword();
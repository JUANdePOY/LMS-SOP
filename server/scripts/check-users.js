const db = require('../config/database');

async function checkUsers() {
  try {
    const [rows] = await db.query(`SELECT u.id, u.email, u.role, r.service_number, r.first_name, r.last_name 
      FROM users u 
      LEFT JOIN reservists r ON u.id = r.user_id 
      LIMIT 20`);
    console.log('Users in database:');
    rows.forEach(u => {
      console.log(`  ID: ${u.id}, Email: ${u.email}, Role: ${u.role}, Svc#: ${u.service_number}, Name: ${u.first_name} ${u.last_name}`);
    });
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

checkUsers();
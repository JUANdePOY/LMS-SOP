require('dotenv').config();
const db = require('./config/database');

async function check() {
  try {
    // Run the EXACT query from map.js line 42-66
    const whereClause = 'WHERE s.latitude IS NOT NULL AND s.longitude IS NOT NULL';
    const params = [];
    
    const [squadrons] = await db.query(`
      SELECT
        s.id,
        s.name,
        s.code,
        s.location,
        s.specialization,
        s.latitude,
        s.longitude,
        s.is_active,
        g.id as group_id,
        g.name as group_name,
        g.code as group_code,
        ar.id as arsen_id,
        ar.name as arsen_name,
        ar.location as arsen_location,
        COUNT(DISTINCT ra.reservist_id) as total_reservists
      FROM squadron s
      INNER JOIN \`groups\` g ON s.group_id = g.id
      INNER JOIN arsens ar ON g.arsen_id = ar.id
      LEFT JOIN reservist_assignments ra ON s.id = ra.squadron_id
      ${whereClause}
      GROUP BY s.id
      ORDER BY ar.name ASC, g.name ASC, s.name ASC
    `, params);
    
    console.log('Query success, rows:', squadrons.length);
    console.log('Result:', JSON.stringify(squadrons, null, 2));
  } catch (e) {
    console.log('Error:', e.message);
    console.log('SQL:', e.sql);
  }
}
check();
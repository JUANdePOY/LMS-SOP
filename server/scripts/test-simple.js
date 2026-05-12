const db = require('../config/database');

async function testSimple() {
  try {
    console.log('Testing simple query...');
    const start = Date.now();
    const [rows] = await db.query('SELECT 1 as test');
    console.log('Result:', rows);
    console.log('Time:', Date.now() - start, 'ms');
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

testSimple();
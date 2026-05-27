const db = require('./config/database');

async function seedAdminData() {
  try {
    console.log('Starting admin data seeding...');
    
    // Check if arsens table exists and has data
    const [arsenCount] = await db.query('SELECT COUNT(*) as count FROM arsens');
    const arsenExists = arsenCount[0].count > 0;
    
    if (!arsenExists) {
      console.log('No ARSENs found. Creating admin ARSEN...');
      
      // Insert admin ARSEN
      const [arsenResult] = await db.query(
        'INSERT INTO arsens (code, name, location, commander_name, is_active) VALUES (?, ?, ?, ?, ?)',
        ['ADMIN', 'Administrative ARSEN', 'Headquarters', 'System Administrator', 1]
      );
      
      const arsenId = arsenResult.insertId;
      console.log(`Created admin ARSEN with ID: ${arsenId}`);
    } else {
      // Get existing admin ARSEN or use first one
      const [arsens] = await db.query('SELECT id FROM arsens WHERE code = ? LIMIT 1', ['ADMIN']);
      let arsenId;
      
      if (arsens.length > 0) {
        arsenId = arsens[0].id;
        console.log(`Using existing admin ARSEN with ID: ${arsenId}`);
      } else {
        // Create admin ARSEN if none with code ADMIN exists
        const [arsenResult] = await db.query(
          'INSERT INTO arsens (code, name, location, commander_name, is_active) VALUES (?, ?, ?, ?, ?)',
          ['ADMIN', 'Administrative ARSEN', 'Headquarters', 'System Administrator', 1]
        );
        arsenId = arsenResult.insertId;
        console.log(`Created admin ARSEN with ID: ${arsenId}`);
      }
    }
    
    // Check if groups table exists and has data for the arsen
    const [groupCount] = await db.query('SELECT COUNT(*) as count FROM `groups` WHERE arsen_id = ?', [arsenId]);
    const groupExists = groupCount[0].count > 0;
    
    if (!groupExists) {
      console.log('No groups found for admin ARSEN. Creating admin group...');
      
      // Insert admin group
      const [groupResult] = await db.query(
        'INSERT INTO `groups` (arsen_id, code, name, commander_name, is_active) VALUES (?, ?, ?, ?, ?)',
        [arsenId, 'ADMIN', 'Administrative Group', 'System Administrator', 1]
      );
      
      const groupId = groupResult.insertId;
      console.log(`Created admin group with ID: ${groupId}`);
    } else {
      // Check if admin group exists
      const [groups] = await db.query('SELECT id FROM `groups` WHERE arsen_id = ? AND code = ? LIMIT 1', [arsenId, 'ADMIN']);
      
      if (groups.length === 0) {
        console.log('No admin group found for ARSEN. Creating admin group...');
        
        // Insert admin group
        const [groupResult] = await db.query(
          'INSERT INTO `groups` (arsen_id, code, name, commander_name, is_active) VALUES (?, ?, ?, ?, ?)',
          [arsenId, 'ADMIN', 'Administrative Group', 'System Administrator', 1]
        );
        
        const groupId = groupResult.insertId;
        console.log(`Created admin group with ID: ${groupId}`);
      } else {
        console.log(`Admin group already exists with ID: ${groups[0].id}`);
      }
    }
    
    console.log('Admin data seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding admin data:', error);
    throw error;
  }
}

// Run the seeding function
seedAdminData()
  .then(() => {
    console.log('Seeding finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });

module.exports = { seedAdminData };
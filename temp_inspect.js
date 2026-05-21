const db = require('./server/config/database');

(async () => {
  try {
    console.log('Connecting via app db module...');
    const [rows] = await db.query(
      'SELECT id, alert_type, entity_id, is_acknowledged, created_at, title, squadron_id, group_id, arsen_id FROM system_alerts WHERE alert_type = "profile_incomplete" ORDER BY id DESC LIMIT 30'
    );
    console.log('Latest 30 profile_incomplete rows:');
    console.dir(rows, {depth: null});

    const [cnt] = await db.query('SELECT COUNT(*) as total FROM system_alerts WHERE alert_type = "profile_incomplete"');
    console.log('Total profile_incomplete rows in DB:', cnt[0].total);

    // Also check entity_id distribution for this type
    const [dist] = await db.query(
      'SELECT entity_id, COUNT(*) as c, SUM(CASE WHEN is_acknowledged=0 THEN 1 ELSE 0 END) as unacked FROM system_alerts WHERE alert_type = "profile_incomplete" GROUP BY entity_id ORDER BY c DESC'
    );
    console.log('By entity_id for profile_incomplete:');
    console.dir(dist);
  } catch (e) {
    console.error('Error querying:', e.message);
    console.error(e.stack);
  } finally {
    process.exit(0);
  }
})();

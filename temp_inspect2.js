const db = require('./server/config/database');

(async () => {
  try {
    const [all] = await db.query(
      `SELECT alert_type, entity_id, COUNT(*) as cnt, 
              GROUP_CONCAT(id ORDER BY id) as ids,
              MAX(created_at) as latest,
              SUM(CASE WHEN is_acknowledged=0 THEN 1 ELSE 0 END) as unacked_cnt
       FROM system_alerts 
       GROUP BY alert_type, entity_id 
       HAVING cnt > 1 OR unacked_cnt > 0
       ORDER BY unacked_cnt DESC, cnt DESC, alert_type, entity_id`
    );
    console.log('Groups with duplicates or current unacked:');
    console.dir(all, {depth: null});

    // Show the actual unacked ones that would be returned now
    const [unacked] = await db.query(
      `SELECT id, alert_type, entity_id, severity, title, created_at 
       FROM system_alerts 
       WHERE is_acknowledged = 0 
       ORDER BY severity, alert_type, entity_id, created_at DESC`
    );
    console.log('\nCurrently unacknowledged system alerts (what the page would show):', unacked.length);
    console.dir(unacked);

    // Count by severity among unacked
    const [bySev] = await db.query(
      `SELECT severity, COUNT(*) as c FROM system_alerts WHERE is_acknowledged=0 GROUP BY severity`
    );
    console.log('\nUnacked by severity:', bySev);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
})();

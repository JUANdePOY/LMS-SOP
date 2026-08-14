require('dotenv').config();
const db = require('./config/database');

(async () => {
  try {
    // Find a department head
    const [dh] = await db.query("SELECT id, full_name, role, department_id FROM users WHERE role = 'department_head' LIMIT 1");
    console.log('DEPT HEAD:', JSON.stringify(dh[0] || null));

    if (dh[0]) {
      const deptId = dh[0].department_id;
      // Simulate listCourses WHERE for department head
      const { where, params } = { where: 'c.department_id = ? OR c.department_id IS NULL', params: [deptId] };
      const [rows] = await db.query(
        `SELECT c.id, c.title, c.department_id, c.is_deleted
         FROM courses c
         WHERE ${where} AND c.is_deleted = FALSE
         ORDER BY c.created_at DESC LIMIT 20`,
        params
      );
      console.log('DEPT HEAD VISIBLE COURSES (is_deleted=FALSE):', rows.length);
      console.log(rows.map(r => ({ id: r.id, dept: r.department_id, del: r.is_deleted, title: r.title })));

      // Check for ANY soft-deleted course visible to dept head logic
      const [delRows] = await db.query(
        `SELECT c.id, c.title, c.department_id, c.is_deleted
         FROM courses c
         WHERE ${where} AND c.is_deleted = TRUE`,
        params
      );
      console.log('SOFT-DELETED courses matching dept head scope:', delRows.length);
      console.log(delRows.map(r => ({ id: r.id, dept: r.department_id, del: r.is_deleted })));
    }

    // Also check overall: any courses at all and is_deleted distribution
    const [dist] = await db.query("SELECT is_deleted, COUNT(*) AS cnt FROM courses GROUP BY is_deleted");
    console.log('is_deleted distribution:', dist);

    // Check courses with department_id NULL
    const [nullDept] = await db.query("SELECT COUNT(*) AS cnt FROM courses WHERE department_id IS NULL OR department_id = 0");
    console.log('Courses with NULL/0 department_id:', nullDept[0].cnt);
  } catch (e) {
    console.error('ERR', e.message);
  } finally {
    process.exit(0);
  }
})();

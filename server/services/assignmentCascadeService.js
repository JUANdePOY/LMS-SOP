const db = require('../config/database');

async function getDepartments(activeOnly = true) {
  let sql = 'SELECT id, name, code, business_id, parent_department_id, head_user_id FROM departments';
  const params = [];
  if (activeOnly) { sql += ' WHERE status = "active"'; }
  sql += ' ORDER BY name ASC';
  const [rows] = await db.query(sql, params);
  return rows;
}

async function getDepartmentTree(activeOnly = true) {
  const allDepts = await getDepartments(activeOnly);
  const map = new Map();
  const roots = [];
  for (const dept of allDepts) { map.set(dept.id, { ...dept, children: [] }); }
  for (const dept of allDepts) {
    if (dept.parent_department_id && map.has(dept.parent_department_id)) {
      map.get(dept.parent_department_id).children.push(map.get(dept.id));
    } else { roots.push(map.get(dept.id)); }
  }
  return roots;
}

async function getPositionsForDepartment(departmentId) {
  const [rows] = await db.query(
    `SELECT DISTINCT ap.position_name
    FROM assignment_positions ap
    INNER JOIN assignment_users au ON au.assignment_id = ap.assignment_id
    INNER JOIN users u ON u.id = au.user_id
    WHERE (u.department_id = ? OR u.id IN (
      SELECT dm.user_id FROM department_members dm WHERE dm.department_id = ?
    ))
    AND ap.position_name IS NOT NULL AND TRIM(ap.position_name) != ''
    ORDER BY ap.position_name ASC`,
    [departmentId, departmentId]
  );
  return rows.map((r) => r.position_name);
}

async function getAvailablePositions() {
  const [rows] = await db.query(
    `SELECT DISTINCT position_name FROM assignment_positions
    WHERE position_name IS NOT NULL AND TRIM(position_name) != ''
    ORDER BY position_name ASC`
  );
  return rows.map((r) => r.position_name);
}

async function getUsersForDepartment(departmentId, opts = {}) {
  const { positionName, search, page = 1, limit = 50 } = opts;
  const offset = (page - 1) * limit;
  let sql = `SELECT DISTINCT u.id, u.full_name, u.email, u.position_title, u.employee_id
    FROM users u WHERE u.is_active = TRUE
    AND (u.department_id = ? OR u.id IN (
      SELECT dm.user_id FROM department_members dm WHERE dm.department_id = ?
    ))`;
  const params = [departmentId, departmentId];
  if (positionName) { sql += ' AND LOWER(u.position_title) = LOWER(?)'; params.push(positionName); }
  if (search) {
    sql += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.employee_id LIKE ?)';
    const st = '%' + search + '%';
    params.push(st, st, st);
  }
  sql += ' ORDER BY u.full_name ASC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const [rows] = await db.query(sql, params);
  return rows;
}

async function getUserCountByDepartment(departmentId, opts = {}) {
  const { positionName } = opts;
  let sql = `SELECT COUNT(DISTINCT u.id) AS total FROM users u WHERE u.is_active = TRUE
    AND (u.department_id = ? OR u.id IN (
      SELECT dm.user_id FROM department_members dm WHERE dm.department_id = ?
    ))`;
  const params = [departmentId, departmentId];
  if (positionName) { sql += ' AND LOWER(u.position_title) = LOWER(?)'; params.push(positionName); }
  const [rows] = await db.query(sql, params);
  return rows[0]?.total || 0;
}

async function getAssignedAssignments(sopId) {
  const vRows = await db.query(
    'SELECT id FROM sop_versions WHERE sop_id = ? AND is_current = TRUE AND deleted_at IS NULL LIMIT 1',
    [sopId]
  );
  const vRow = vRows[0];
  if (!vRow) return [];
  const [rows] = await db.query(
    `SELECT sa.id AS assignment_id, sa.due_date, sa.notes, sa.assigned_by, sa.is_deleted,
      ad.department_id, d.name AS department_name, ap.position_name,
      au.user_id, u.full_name AS user_name, u.email AS user_email
    FROM sop_assignments sa
    LEFT JOIN assignment_departments ad ON ad.assignment_id = sa.id
    LEFT JOIN departments d ON d.id = ad.department_id
    LEFT JOIN assignment_positions ap ON ap.assignment_id = sa.id
    LEFT JOIN assignment_users au ON au.assignment_id = sa.id
    LEFT JOIN users u ON u.id = au.user_id
    WHERE sa.sop_version_id = ? AND sa.is_deleted = FALSE
    ORDER BY sa.assigned_at DESC`,
    [vRow.id]
  );
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.assignment_id)) {
      map.set(row.assignment_id, { assignment_id: row.assignment_id, due_date: row.due_date, notes: row.notes, departments: [], positions: [], users: [] });
    }
    const e = map.get(row.assignment_id);
    if (row.department_id && !e.departments.find((d) => d.id === row.department_id)) e.departments.push({ id: row.department_id, name: row.department_name });
    if (row.position_name && !e.positions.includes(row.position_name)) e.positions.push(row.position_name);
    if (row.user_id && !e.users.find((u) => u.id === row.user_id)) e.users.push({ id: row.user_id, full_name: row.user_name, email: row.user_email });
  }
  return Array.from(map.values());
}

module.exports = { getDepartments, getDepartmentTree, getPositionsForDepartment, getAvailablePositions, getUsersForDepartment, getUserCountByDepartment, getAssignedAssignments };

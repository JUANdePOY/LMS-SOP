const db = require('../config/database');

const DEPARTMENT_STATUSES = ['active', 'inactive', 'archived'];

async function findAll(filters = {}) {
  const { search, status, page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT d.*, 
           CONCAT(m.first_name, ' ', m.last_name) AS head_name,
           (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.is_active = TRUE) AS user_count
    FROM departments d
    LEFT JOIN users m ON d.head_user_id = m.id
    WHERE 1 = 1
  `;
  const params = [];

  if (search) {
    sql += ' AND (d.name LIKE ? OR d.code LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status && status !== 'all') {
    sql += ' AND d.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY d.name ASC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.query(sql, params);

  const countSql = `SELECT COUNT(*) AS total FROM departments d WHERE 1 = 1`;
  const countParams = [];
  if (search) {
    countSql += ' AND (d.name LIKE ? OR d.code LIKE ?)';
    countParams.push(`%${search}%`, `%${search}%`);
  }
  if (status && status !== 'all') {
    countSql += ' AND d.status = ?';
    countParams.push(status);
  }
  const [countRows] = await db.query(countSql, countParams);

  return {
    rows,
    total: countRows[0]?.total ?? 0,
    page,
    limit,
    totalPages: Math.ceil((countRows[0]?.total ?? 0) / limit),
  };
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT d.*, CONCAT(m.first_name, ' ', m.last_name) AS head_name
     FROM departments d
     LEFT JOIN users m ON d.head_user_id = m.id
     WHERE d.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function findByCode(code) {
  const [rows] = await db.query(
    'SELECT * FROM departments WHERE code = ?',
    [code]
  );
  return rows[0] || null;
}

async function create(data) {
  const { name, code, description, parent_department_id, head_user_id, status } = data;
  const [result] = await db.query(
    `INSERT INTO departments (name, code, description, parent_department_id, head_user_id, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, code, description ?? null, parent_department_id ?? null, head_user_id ?? null, status || 'active']
  );
  return result.insertId;
}

async function update(id, data) {
  const { name, code, description, parent_department_id, head_user_id, status } = data;
  const sets = [];
  const params = [];

  if (name !== undefined) { sets.push('name = ?'); params.push(name); }
  if (code !== undefined) { sets.push('code = ?'); params.push(code); }
  if (description !== undefined) { sets.push('description = ?'); params.push(description); }
  if (parent_department_id !== undefined) { sets.push('parent_department_id = ?'); params.push(parent_department_id); }
  if (head_user_id !== undefined) { sets.push('head_user_id = ?'); params.push(head_user_id); }
  if (status !== undefined) { sets.push('status = ?'); params.push(status); }

  if (!sets.length) return 0;

  params.push(id);
  const [result] = await db.query(
    `UPDATE departments SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    params
  );
  return result.affectedRows;
}

async function remove(id) {
  const [result] = await db.query('DELETE FROM departments WHERE id = ?', [id]);
  return result.affectedRows;
}

async function getHierarchy() {
  const [rows] = await db.query(
    `SELECT d.*, CONCAT(m.first_name, ' ', m.last_name) AS head_name,
            (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.is_active = TRUE) AS user_count
     FROM departments d
     LEFT JOIN users m ON d.head_user_id = m.id
     WHERE d.parent_department_id IS NULL
     ORDER BY d.name ASC`
  );

  for (const dept of rows) {
    dept.children = await getChildren(dept.id);
  }

  return rows;
}

async function getChildren(parentId) {
  const [rows] = await db.query(
    `SELECT d.*, CONCAT(m.first_name, ' ', m.last_name) AS head_name,
            (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.is_active = TRUE) AS user_count
     FROM departments d
     LEFT JOIN users m ON d.head_user_id = m.id
     WHERE d.parent_department_id = ?
     ORDER BY d.name ASC`,
    [parentId]
  );

  for (const dept of rows) {
    dept.children = await getChildren(dept.id);
  }

  return rows;
}

async function getUsers(departmentId) {
  const [rows] = await db.query(
    `SELECT u.id, u.full_name, u.email, u.position_title, u.employment_status, u.is_active,
            r.name AS role_name
     FROM users u
     LEFT JOIN roles r ON u.role = r.name
     WHERE u.department_id = ?
     ORDER BY u.full_name ASC`,
    [departmentId]
  );
  return rows;
}

module.exports = {
  findAll,
  findById,
  findByCode,
  create,
  update,
  remove,
  getHierarchy,
  getChildren,
  getUsers,
  DEPARTMENT_STATUSES,
};
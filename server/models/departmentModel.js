const db = require('../config/database');

const DEPARTMENT_STATUSES = ['active', 'inactive', 'archived'];

async function findAll(filters = {}) {
  const { search, status, business_id, page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT d.*, 
           m.full_name AS head_name,
           b.business_name,
           (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.is_active = TRUE) AS user_count
    FROM departments d
    LEFT JOIN users m ON d.head_user_id = m.id
    LEFT JOIN businesses b ON d.business_id = b.id
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
  if (business_id) {
    sql += ' AND d.business_id = ?';
    params.push(business_id);
  }

  sql += ' ORDER BY d.name ASC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.query(sql, params);

  let countSql = `SELECT COUNT(*) AS total FROM departments d WHERE 1 = 1`;
  const countParams = [];
  if (search) {
    countSql += ' AND (d.name LIKE ? OR d.code LIKE ?)';
    countParams.push(`%${search}%`, `%${search}%`);
  }
  if (status && status !== 'all') {
    countSql += ' AND d.status = ?';
    countParams.push(status);
  }
  if (business_id) {
    countSql += ' AND d.business_id = ?';
    countParams.push(business_id);
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
    `SELECT d.*, m.full_name AS head_name
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
  const { name, code, description, parent_department_id, head_user_id, status, business_id } = data;
  const [result] = await db.query(
    `INSERT INTO departments (name, code, description, parent_department_id, head_user_id, status, business_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, code, description ?? null, parent_department_id ?? null, head_user_id ?? null, status || 'active', business_id ?? null]
  );
  return result.insertId;
}

async function update(id, data) {
  const { name, code, description, parent_department_id, head_user_id, status, business_id } = data;
  const sets = [];
  const params = [];

  if (name !== undefined) { sets.push('name = ?'); params.push(name); }
  if (code !== undefined) { sets.push('code = ?'); params.push(code); }
  if (description !== undefined) { sets.push('description = ?'); params.push(description); }
  if (parent_department_id !== undefined) { sets.push('parent_department_id = ?'); params.push(parent_department_id); }
  if (head_user_id !== undefined) { sets.push('head_user_id = ?'); params.push(head_user_id); }
  if (status !== undefined) { sets.push('status = ?'); params.push(status); }
  if (business_id !== undefined) { sets.push('business_id = ?'); params.push(business_id); }

  if (!sets.length) return 0;

  params.push(id);
  const [result] = await db.query(
    `UPDATE departments SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    params
  );
  return result.affectedRows;
}

async function remove(id) {
  // Check for dependent SOPs (soft-deleted ones are excluded)
  const [sops] = await db.query(
    'SELECT COUNT(*) AS count FROM sops WHERE department_id = ? AND deleted_at IS NULL',
    [id]
  );

  // Check for active users in this department
  const [users] = await db.query(
    'SELECT COUNT(*) AS count FROM users WHERE department_id = ? AND is_active = TRUE',
    [id]
  );

  // Check for approval workflows tied to this department
  const [workflows] = await db.query(
    'SELECT COUNT(*) AS count FROM approval_workflows WHERE department_id = ?',
    [id]
  );

  // Check for categories tied to this department
  const [categories] = await db.query(
    'SELECT COUNT(*) AS count FROM categories WHERE department_id = ?',
    [id]
  );

  // Check for assignment_departments entries
  const [assignments] = await db.query(
    'SELECT COUNT(*) AS count FROM assignment_departments WHERE department_id = ?',
    [id]
  );

  const blockers = [];
  if (sops[0]?.count > 0) blockers.push(`${sops[0].count} SOP(s)`);
  if (users[0]?.count > 0) blockers.push(`${users[0].count} active user(s)`);
  if (workflows[0]?.count > 0) blockers.push(`${workflows[0].count} approval workflow(s)`);
  if (categories[0]?.count > 0) blockers.push(`${categories[0].count} categor(y/ies)`);
  if (assignments[0]?.count > 0) blockers.push(`${assignments[0].count} assignment(s)`);

  if (blockers.length > 0) {
    const err = new Error(
      `Cannot delete department because the following records still reference it: ${blockers.join(', ')}. Please reassign or remove these records first.`
    );
    err.code = 'HAS_DEPENDENCIES';
    throw err;
  }

  const [result] = await db.query('DELETE FROM departments WHERE id = ?', [id]);
  return result.affectedRows;
}

async function getHierarchy() {
  const [rows] = await db.query(
    `SELECT d.*, m.full_name AS head_name,
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
    `SELECT d.*, m.full_name AS head_name,
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
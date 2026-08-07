const db = require('../config/database');

async function findAll(filters = {}) {
  const { search, department_id, page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT c.*, d.name AS department_name
    FROM categories c
    LEFT JOIN departments d ON c.department_id = d.id
    WHERE c.deleted_at IS NULL
  `;
  const params = [];

  if (search) {
    sql += ' AND (c.name LIKE ? OR c.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (department_id) {
    sql += ' AND c.department_id = ?';
    params.push(department_id);
  }

  sql += ' ORDER BY c.name ASC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.query(sql, params);

  let countSql = `SELECT COUNT(*) AS total FROM categories c WHERE c.deleted_at IS NULL`;
  const countParams = [];
  if (search) {
    countSql += ' AND (c.name LIKE ? OR c.description LIKE ?)';
    countParams.push(`%${search}%`, `%${search}%`);
  }
  if (department_id) {
    countSql += ' AND c.department_id = ?';
    countParams.push(department_id);
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
    `SELECT c.*, d.name AS department_name
     FROM categories c
     LEFT JOIN departments d ON c.department_id = d.id
     WHERE c.id = ? AND c.deleted_at IS NULL`,
    [id]
  );
  return rows[0] || null;
}

async function findByName(name, departmentId = null) {
  let sql = 'SELECT * FROM categories WHERE name = ? AND deleted_at IS NULL';
  const params = [name];
  if (departmentId) {
    sql += ' AND department_id = ?';
    params.push(departmentId);
  }
  const [rows] = await db.query(sql, params);
  return rows[0] || null;
}

async function create(data) {
  const { name, department_id, description, created_by } = data;
  const [result] = await db.query(
    `INSERT INTO categories (public_id, name, department_id, description, is_active, created_by, created_at, updated_at)
     VALUES (UUID(), ?, ?, ?, TRUE, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [name, department_id, description, created_by]
  );
  return result.insertId;
}

async function update(id, data) {
  const sets = [];
  const params = [];

  if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
  if (data.department_id !== undefined) { sets.push('department_id = ?'); params.push(data.department_id); }
  if (data.description !== undefined) { sets.push('description = ?'); params.push(data.description); }
  if (data.is_active !== undefined) { sets.push('is_active = ?'); params.push(data.is_active ? 1 : 0); }

  if (!sets.length) return 0;

  params.push(id);
  const [result] = await db.query(
    `UPDATE categories SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`,
    params
  );
  return result.affectedRows;
}

async function softDelete(id, force = false) {
  // sops.category_id is nullable with ON DELETE SET NULL, but this is a *soft*
  // delete, so the FK never fires and SOPs would keep pointing at a category
  // that no longer appears in any listing. Surface that as a blocker instead of
  // silently leaving dangling references.
  const [sops] = await db.query(
    'SELECT COUNT(*) AS count FROM sops WHERE category_id = ? AND deleted_at IS NULL',
    [id]
  );
  const sopCount = sops[0]?.count ?? 0;

  if (sopCount > 0 && !force) {
    const err = new Error(
      `Cannot delete category because ${sopCount} SOP(s) still reference it. Please reassign or remove these records first.`
    );
    err.code = 'HAS_DEPENDENCIES';
    throw err;
  }

  if (force && sopCount > 0) {
    // Detach the SOPs so the soft-delete does not leave dangling references.
    await db.query('UPDATE sops SET category_id = NULL WHERE category_id = ?', [id]);
  }

  const [result] = await db.query(
    'UPDATE categories SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  return result.affectedRows;
}

module.exports = {
  findAll,
  findById,
  findByName,
  create,
  update,
  softDelete,
};
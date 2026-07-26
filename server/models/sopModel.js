const db = require('../config/database');

async function findAll(filters = {}) {
  const { search, status, department_id, category_id, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT s.*, d.name AS department_name, c.name AS category_name, u.full_name AS owner_name
    FROM sops s
    LEFT JOIN departments d ON s.department_id = d.id
    LEFT JOIN categories c ON s.category_id = c.id
    LEFT JOIN users u ON s.owner_user_id = u.id
    WHERE s.is_deleted = FALSE
  `;
  const params = [];

  if (search) {
    sql += ' AND (s.title LIKE ? OR s.code LIKE ? OR s.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) {
    sql += ' AND s.status = ?';
    params.push(status);
  }
  if (department_id) {
    sql += ' AND s.department_id = ?';
    params.push(department_id);
  }
  if (category_id) {
    sql += ' AND s.category_id = ?';
    params.push(category_id);
  }

  sql += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.query(sql, params);

  let countSql = `
    SELECT COUNT(*) AS total
    FROM sops s
    WHERE s.is_deleted = FALSE
  `;
  const countParams = [];
  if (search) {
    countSql += ' AND (s.title LIKE ? OR s.code LIKE ? OR s.description LIKE ?)';
    countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) {
    countSql += ' AND s.status = ?';
    countParams.push(status);
  }
  if (department_id) {
    countSql += ' AND s.department_id = ?';
    countParams.push(department_id);
  }
  if (category_id) {
    countSql += ' AND s.category_id = ?';
    countParams.push(category_id);
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
  const [rows] = await db.query(`
    SELECT s.*, d.name AS department_name, c.name AS category_name, u.full_name AS owner_name
    FROM sops s
    LEFT JOIN departments d ON s.department_id = d.id
    LEFT JOIN categories c ON s.category_id = c.id
    LEFT JOIN users u ON s.owner_user_id = u.id
    WHERE s.id = ? AND s.is_deleted = FALSE
  `, [id]);
  return rows[0] || null;
}

async function findByCode(code) {
  const [rows] = await db.query('SELECT * FROM sops WHERE code = ? AND is_deleted = FALSE', [code]);
  return rows[0] || null;
}

async function create(data) {
  const {
    title,
    code,
    description,
    department_id,
    category_id,
    owner_user_id,
    status = 'Draft',
    version = '1.0',
    is_published = false,
    is_archived = false,
    metadata = null,
  } = data;

  const [result] = await db.query(`
    INSERT INTO sops (
      title,
      code,
      description,
      department_id,
      category_id,
      owner_user_id,
      status,
      version,
      is_published,
      is_archived,
      metadata,
      is_deleted,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [title, code, description || null, department_id || null, category_id || null, owner_user_id || null, status, version, is_published ? 1 : 0, is_archived ? 1 : 0, metadata ? JSON.stringify(metadata) : null]);

  return result.insertId;
}

async function update(id, data) {
  const sets = [];
  const params = [];

  const allowedFields = ['title', 'code', 'description', 'department_id', 'category_id', 'owner_user_id', 'status', 'version', 'is_published', 'is_archived', 'metadata'];
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      sets.push(`${field} = ?`);
      params.push(field === 'metadata' && data[field] ? JSON.stringify(data[field]) : data[field]);
    }
  }

  if (!sets.length) return 0;

  params.push(id);
  const [result] = await db.query(`UPDATE sops SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
  return result.affectedRows;
}

async function softDelete(id) {
  const [result] = await db.query('UPDATE sops SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  return result.affectedRows;
}

module.exports = {
  findAll,
  findById,
  findByCode,
  create,
  update,
  softDelete,
};

const db = require('../config/database');

async function getColumns(table) {
  const [rows] = await db.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
  `, [table]);
  return new Set(rows.map(r => r.COLUMN_NAME));
}

let sopsColumns = null;
async function getSopsColumns() {
  if (!sopsColumns) {
    const cols = await getColumns('sops');
    sopsColumns = {
      code: cols.has('code') ? 'code' : 'sop_code',
      owner: cols.has('owner_user_id') ? 'owner_user_id' : 'owner_id',
      softDelete: cols.has('is_deleted') ? 'is_deleted' : 'deleted_at',
      hasVersion: cols.has('version'),
      hasCurrentVersion: cols.has('current_version_id'),
      hasCreatedBy: cols.has('created_by'),
      hasUpdatedBy: cols.has('updated_by'),
      hasPublicId: cols.has('public_id'),
      hasCategory: cols.has('category_id'),
      hasDepartment: cols.has('department_id'),
      hasIsPublished: cols.has('is_published'),
      hasIsArchived: cols.has('is_archived'),
    };
  }
  return sopsColumns;
}

// The real table uses `deleted_at IS NULL`, not `is_deleted = 0` — the old
// `s.deleted_at = 0` comparison silently matched nothing (or the wrong
// rows), which is why findAll()/findById() were returning empty results.
function notDeletedClause(cols, alias = 's') {
  return cols.softDelete === 'is_deleted'
    ? `(${alias}.is_deleted = 0 OR ${alias}.is_deleted IS NULL)`
    : `${alias}.deleted_at IS NULL`;
}

async function findAll(filters = {}) {
  const cols = await getSopsColumns();
  const { search, status, department_id, category_id, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT s.*, d.name AS department_name, c.name AS category_name, u.full_name AS owner_name
    FROM sops s
    LEFT JOIN departments d ON s.department_id = d.id
    LEFT JOIN categories c ON s.category_id = c.id
    LEFT JOIN users u ON s.${cols.owner} = u.id
    WHERE ${notDeletedClause(cols)}
  `;
  const params = [];

  if (search) {
    sql += ' AND (s.title LIKE ? OR s.' + cols.code + ' LIKE ? OR s.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) {
    sql += ' AND s.status = ?';
    params.push(status);
  }
  if (department_id && cols.hasDepartment) {
    sql += ' AND s.department_id = ?';
    params.push(department_id);
  }
  if (category_id && cols.hasCategory) {
    sql += ' AND s.category_id = ?';
    params.push(category_id);
  }

  sql += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.query(sql, params);

  let countSql = `
    SELECT COUNT(*) AS total
    FROM sops s
    WHERE ${notDeletedClause(cols)}
  `;
  const countParams = [];
  if (search) {
    countSql += ' AND (s.title LIKE ? OR s.' + cols.code + ' LIKE ? OR s.description LIKE ?)';
    countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) {
    countSql += ' AND s.status = ?';
    countParams.push(status);
  }
  if (department_id && cols.hasDepartment) {
    countSql += ' AND s.department_id = ?';
    countParams.push(department_id);
  }
  if (category_id && cols.hasCategory) {
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
  const cols = await getSopsColumns();
  const [rows] = await db.query(`
    SELECT s.*, d.name AS department_name, c.name AS category_name, u.full_name AS owner_name
    FROM sops s
    LEFT JOIN departments d ON s.department_id = d.id
    LEFT JOIN categories c ON s.category_id = c.id
    LEFT JOIN users u ON s.${cols.owner} = u.id
    WHERE s.id = ? AND ${notDeletedClause(cols)}
  `, [id]);
  return rows[0] || null;
}

async function findByCode(code) {
  const cols = await getSopsColumns();
  const [rows] = await db.query(
    `SELECT * FROM sops s WHERE s.${cols.code} = ? AND ${notDeletedClause(cols)}`,
    [code],
  );
  return rows[0] || null;
}

async function create(data) {
  const cols = await getSopsColumns();
  const {
    title,
    code,
    description,
    department_id,
    category_id,
    owner_user_id,
    status = 'Draft',
    version,
  } = data;

  const insertCols = ['title', cols.code, 'description', 'department_id', 'category_id', cols.owner, 'status'];
  const insertVals = [title, code || null, description || null, department_id || null, category_id || null, owner_user_id || null, status || 'Draft'];

  // `version` and `is_published`/`is_archived` only get written if the
  // table actually has those columns — on the real schema it doesn't
  // (version lives in sop_versions instead), so these are no-ops there.
  if (cols.hasVersion && version) {
    insertCols.push('version');
    insertVals.push(version);
  }
  if (cols.hasCreatedBy) {
    insertCols.push('created_by');
    insertVals.push(owner_user_id || null);
  }
  if (cols.hasUpdatedBy) {
    insertCols.push('updated_by');
    insertVals.push(owner_user_id || null);
  }
  if (cols.softDelete === 'is_deleted') {
    insertCols.push('is_deleted');
    insertVals.push(0);
  }

  const [result] = await db.query(
    `INSERT INTO sops (${insertCols.join(', ')}) VALUES (${insertCols.map(() => '?').join(', ')})`,
    insertVals
  );

  return result.insertId;
}

async function update(id, data) {
  const cols = await getSopsColumns();
  const sets = [];
  const params = [];

  const allowedFields = ['title', cols.code, 'description', 'department_id', 'category_id', 'status'];
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      sets.push(`${field} = ?`);
      params.push(data[field]);
    }
  }

  if (data.owner_user_id !== undefined && cols.owner === 'owner_user_id') {
    sets.push('owner_user_id = ?');
    params.push(data.owner_user_id);
  }
  if (data.owner_id !== undefined && cols.owner === 'owner_id') {
    sets.push('owner_id = ?');
    params.push(data.owner_id);
  }
  if (data.version !== undefined && cols.hasVersion) {
    sets.push('version = ?');
    params.push(data.version);
  }
  if (data.is_published !== undefined && cols.hasIsPublished) {
    sets.push('is_published = ?');
    params.push(data.is_published ? 1 : 0);
  }
  if (data.is_archived !== undefined && cols.hasIsArchived) {
    sets.push('is_archived = ?');
    params.push(data.is_archived ? 1 : 0);
  }
  // `metadata` has no column on either schema variant here, so it's
  // intentionally not written — passing it through no longer crashes,
  // it's just silently dropped.

  if (!sets.length) return 0;

  sets.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);
  const [result] = await db.query(`UPDATE sops SET ${sets.join(', ')} WHERE id = ?`, params);
  return result.affectedRows;
}

async function softDelete(id) {
  const cols = await getSopsColumns();
  if (cols.softDelete === 'is_deleted') {
    const [result] = await db.query('UPDATE sops SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    return result.affectedRows;
  }
  const [result] = await db.query('UPDATE sops SET deleted_at = NOW(), updated_at = NOW() WHERE id = ?', [id]);
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
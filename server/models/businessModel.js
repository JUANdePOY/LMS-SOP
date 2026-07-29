const db = require('../config/database');
const fs = require('fs');
const path = require('path');

const BUSINESS_STATUSES = ['active', 'inactive'];

async function findAll(filters = {}) {
  const { search, status, page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT b.*,
           creator.full_name AS created_by_name,
           updater.full_name AS updated_by_name,
           (SELECT COUNT(*) FROM departments d WHERE d.business_id = b.id) AS department_count
    FROM businesses b
    LEFT JOIN users creator ON b.created_by = creator.id
    LEFT JOIN users updater ON b.updated_by = updater.id
    WHERE 1 = 1
  `;
  const params = [];

  if (search) {
    sql += ' AND (b.business_name LIKE ? OR b.business_code LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status && status !== 'all') {
    sql += ' AND b.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY b.business_name ASC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.query(sql, params);

  let countSql = `SELECT COUNT(*) AS total FROM businesses b WHERE 1 = 1`;
  const countParams = [];
  if (search) {
    countSql += ' AND (b.business_name LIKE ? OR b.business_code LIKE ?)';
    countParams.push(`%${search}%`, `%${search}%`);
  }
  if (status && status !== 'all') {
    countSql += ' AND b.status = ?';
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
    `SELECT b.*,
            creator.full_name AS created_by_name,
            updater.full_name AS updated_by_name
     FROM businesses b
     LEFT JOIN users creator ON b.created_by = creator.id
     LEFT JOIN users updater ON b.updated_by = updater.id
     WHERE b.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function findByCode(code) {
  const [rows] = await db.query(
    'SELECT * FROM businesses WHERE business_code = ?',
    [code]
  );
  return rows[0] || null;
}

async function create(data, userId) {
  const { business_code, business_name, description, logo_url, email, phone, address, status } = data;
  const [result] = await db.query(
    `INSERT INTO businesses (business_code, business_name, description, logo_url, email, phone, address, status, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [business_code, business_name, description ?? null, logo_url ?? null, email ?? null, phone ?? null, address ?? null, status || 'active', userId, userId]
  );
  return result.insertId;
}

async function update(id, data, userId) {
  const { business_code, business_name, description, logo_url, email, phone, address, status } = data;
  const sets = [];
  const params = [];

  if (business_code !== undefined) { sets.push('business_code = ?'); params.push(business_code); }
  if (business_name !== undefined) { sets.push('business_name = ?'); params.push(business_name); }
  if (description !== undefined) { sets.push('description = ?'); params.push(description); }
  if (logo_url !== undefined) { sets.push('logo_url = ?'); params.push(logo_url); }
  if (email !== undefined) { sets.push('email = ?'); params.push(email); }
  if (phone !== undefined) { sets.push('phone = ?'); params.push(phone); }
  if (address !== undefined) { sets.push('address = ?'); params.push(address); }
  if (status !== undefined) { sets.push('status = ?'); params.push(status); }

  if (!sets.length) return 0;

  sets.push('updated_by = ?');
  params.push(userId);
  params.push(id);

  const [result] = await db.query(
    `UPDATE businesses SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    params
  );
  return result.affectedRows;
}

async function remove(id) {
  const [deptCheck] = await db.query(
    'SELECT COUNT(*) AS count FROM departments WHERE business_id = ?',
    [id]
  );
  if (deptCheck[0]?.count > 0) {
    const err = new Error('Cannot delete business with existing departments. Remove or reassign departments first.');
    err.statusCode = 409;
    throw err;
  }
  const [result] = await db.query('DELETE FROM businesses WHERE id = ?', [id]);
  return result.affectedRows;
}

async function removeOldLogo(logoUrl) {
  if (!logoUrl || typeof logoUrl !== 'string') return;
  const relativePath = logoUrl.replace(/^\/api\//, '');
  const absPath = path.join(__dirname, '..', relativePath);
  if (fs.existsSync(absPath)) {
    try {
      fs.unlinkSync(absPath);
    } catch (err) {
      console.error('Failed to remove old business logo:', err);
    }
  }
}

async function getHierarchy() {
  const [businesses] = await db.query(
    `SELECT b.*,
            (SELECT COUNT(*) FROM departments d WHERE d.business_id = b.id) AS department_count
     FROM businesses b
     WHERE b.status = 'active'
     ORDER BY b.business_name ASC`
  );

  for (const business of businesses) {
    business.departments = await getDepartmentTreeForBusiness(business.id);
  }

  return businesses;
}

async function getDepartmentTreeForBusiness(businessId) {
  const [rootDepts] = await db.query(
    `SELECT d.*, m.full_name AS head_name,
            (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.is_active = TRUE) AS user_count,
            (SELECT COUNT(*) FROM sops s WHERE s.department_id = d.id AND s.deleted_at IS NULL) AS sop_count
     FROM departments d
     LEFT JOIN users m ON d.head_user_id = m.id
     WHERE d.business_id = ? AND d.parent_department_id IS NULL
     ORDER BY d.name ASC`,
    [businessId]
  );

  for (const dept of rootDepts) {
    dept.children = await getDepartmentChildren(dept.id);
  }

  return rootDepts;
}

async function getDepartmentChildren(parentId) {
  const [rows] = await db.query(
    `SELECT d.*, m.full_name AS head_name,
            (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.is_active = TRUE) AS user_count,
            (SELECT COUNT(*) FROM sops s WHERE s.department_id = d.id AND s.deleted_at IS NULL) AS sop_count
     FROM departments d
     LEFT JOIN users m ON d.head_user_id = m.id
     WHERE d.parent_department_id = ?
     ORDER BY d.name ASC`,
    [parentId]
  );

  for (const dept of rows) {
    dept.children = await getDepartmentChildren(dept.id);
  }

  return rows;
}

module.exports = {
  findAll,
  findById,
  findByCode,
  create,
  update,
  remove,
  removeOldLogo,
  getHierarchy,
  BUSINESS_STATUSES,
};

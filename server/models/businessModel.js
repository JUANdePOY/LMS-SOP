const db = require('../config/database');
const departmentModel = require('./departmentModel');

const BUSINESS_STATUSES = ['active', 'inactive'];

async function findAll(filters = {}) {
  const { search, status, page = 1, limit = 50, business_id } = filters;
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
  if (business_id) {
    sql += ' AND b.id = ?';
    params.push(parseInt(business_id, 10));
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
  if (business_id) {
    countSql += ' AND b.id = ?';
    countParams.push(parseInt(business_id, 10));
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
  const {
    business_code, business_name, description, email, phone, address, status,
    logo_data, logo_name, logo_mime_type, logo_size,
  } = data;
  const [result] = await db.query(
    `INSERT INTO businesses
       (business_code, business_name, description, logo_data, logo_name, logo_mime_type, logo_size, email, phone, address, status, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      business_code, business_name, description ?? null,
      logo_data ?? null, logo_name ?? null, logo_mime_type ?? null, logo_size ?? null,
      email ?? null, phone ?? null, address ?? null, status || 'active', userId, userId,
    ]
  );
  return result.insertId;
}

async function update(id, data, userId) {
  const {
    business_code, business_name, description, email, phone, address, status,
    logo_data, logo_name, logo_mime_type, logo_size,
  } = data;
  const sets = [];
  const params = [];

  if (business_code !== undefined) { sets.push('business_code = ?'); params.push(business_code); }
  if (business_name !== undefined) { sets.push('business_name = ?'); params.push(business_name); }
  if (description !== undefined) { sets.push('description = ?'); params.push(description); }
  if (logo_data !== undefined) { sets.push('logo_data = ?'); params.push(logo_data); }
  if (logo_name !== undefined) { sets.push('logo_name = ?'); params.push(logo_name); }
  if (logo_mime_type !== undefined) { sets.push('logo_mime_type = ?'); params.push(logo_mime_type); }
  if (logo_size !== undefined) { sets.push('logo_size = ?'); params.push(logo_size); }
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

async function saveLogo(id, { buffer, name, mime, size }) {
  const [result] = await db.query(
    `UPDATE businesses
     SET logo_data = ?, logo_name = ?, logo_mime_type = ?, logo_size = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [buffer, name, mime, size, id]
  );
  return result.affectedRows;
}

async function getLogo(id) {
  const [rows] = await db.query(
    `SELECT logo_data, logo_mime_type, logo_name, logo_size FROM businesses WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function clearLogo(id) {
  const [result] = await db.query(
    `UPDATE businesses SET logo_data = NULL, logo_name = NULL, logo_mime_type = NULL, logo_size = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [id]
  );
  return result.affectedRows;
}

async function remove(id, force = false) {
  const [deptRows] = await db.query(
    'SELECT id FROM departments WHERE business_id = ?',
    [id]
  );

  if (deptRows.length > 0 && !force) {
    const err = new Error('Cannot delete business with existing departments. Remove or reassign departments first.');
    err.statusCode = 409;
    throw err;
  }

  if (!deptRows.length) {
    const [result] = await db.query('DELETE FROM businesses WHERE id = ?', [id]);
    return result.affectedRows;
  }

  // Force delete with departments attached.
  //
  // departments.business_id is NOT NULL and fk_department_business declares no
  // ON DELETE action (so it behaves as RESTRICT). That means we can neither
  // orphan the departments by nulling business_id nor let the FK clean up for
  // us -- each department must be force-deleted first. The whole cascade runs
  // in one transaction so a failure part-way cannot leave the business deleted
  // with dangling departments (or vice versa).
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    for (const dept of deptRows) {
      await departmentModel.removeWithConnection(conn, dept.id, true);
    }

    const [result] = await conn.query('DELETE FROM businesses WHERE id = ?', [id]);
    await conn.commit();
    return result.affectedRows;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
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

  const allDeptIds = [];
  for (const business of businesses) {
    collectDepartmentIds(business.departments || [], allDeptIds);
  }

  if (allDeptIds.length > 0) {
    const categoriesByDeptId = await getCategoriesByDepartmentIds(allDeptIds);
    attachCategoriesToTree(businesses, categoriesByDeptId);
  }

  return businesses;
}

function collectDepartmentIds(departments, ids) {
  for (const dept of departments) {
    ids.push(dept.id);
    if (dept.children && dept.children.length > 0) {
      collectDepartmentIds(dept.children, ids);
    }
  }
}

async function getCategoriesByDepartmentIds(deptIds) {
  const placeholders = deptIds.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT c.id, c.name, c.description, c.department_id,
            (SELECT COUNT(*) FROM sops s WHERE s.category_id = c.id AND s.deleted_at IS NULL) AS sop_count
     FROM categories c
     WHERE c.department_id IN (${placeholders}) AND c.deleted_at IS NULL
     ORDER BY c.department_id ASC, c.name ASC`,
    deptIds
  );

  const grouped = {};
  for (const row of rows) {
    if (!grouped[row.department_id]) {
      grouped[row.department_id] = [];
    }
    grouped[row.department_id].push(row);
  }
  return grouped;
}

function attachCategoriesToTree(businesses, categoriesByDeptId) {
  for (const business of businesses) {
    attachCategories(business.departments || [], categoriesByDeptId);
  }
}

function attachCategories(departments, categoriesByDeptId) {
  for (const dept of departments) {
    dept.categories = categoriesByDeptId[dept.id] || [];
    if (dept.children && dept.children.length > 0) {
      attachCategories(dept.children, categoriesByDeptId);
    }
  }
}

// sop_count now includes SOPs assigned to this department via
// sop_assignments -> sop_versions -> assignment_departments, not just SOPs
// whose legacy sops.department_id column points here. COUNT(DISTINCT s.id)
// prevents a SOP that's assigned to several departments (or matches both
// the owner column and an assignment) from being double-counted within a
// single department's badge.
async function getDepartmentTreeForBusiness(businessId) {
  const [rootDepts] = await db.query(
    `SELECT d.*, m.full_name AS head_name,
            (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.is_active = TRUE) AS user_count,
            (SELECT COUNT(DISTINCT s.id) FROM sops s
              WHERE s.deleted_at IS NULL
                AND (
                  s.department_id = d.id
                  OR EXISTS (
                    SELECT 1
                    FROM sop_assignments sa
                    INNER JOIN sop_versions sv ON sv.sop_id = s.id
                    INNER JOIN assignment_departments ad ON ad.assignment_id = sa.id
                    WHERE sa.sop_version_id = sv.id
                      AND sv.is_current = TRUE
                      AND sv.deleted_at IS NULL
                      AND sa.is_deleted = FALSE
                      AND ad.department_id = d.id
                  )
                )
            ) AS sop_count
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
            (SELECT COUNT(DISTINCT s.id) FROM sops s
              WHERE s.deleted_at IS NULL
                AND (
                  s.department_id = d.id
                  OR EXISTS (
                    SELECT 1
                    FROM sop_assignments sa
                    INNER JOIN sop_versions sv ON sv.sop_id = s.id
                    INNER JOIN assignment_departments ad ON ad.assignment_id = sa.id
                    WHERE sa.sop_version_id = sv.id
                      AND sv.is_current = TRUE
                      AND sv.deleted_at IS NULL
                      AND sa.is_deleted = FALSE
                      AND ad.department_id = d.id
                  )
                )
            ) AS sop_count
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
  saveLogo,
  getLogo,
  clearLogo,
  getHierarchy,
  getDepartmentTreeForBusiness,
  BUSINESS_STATUSES,
};
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
      hasRestrictionType: cols.has('restriction_type'),
      hasDefaultOnboarding: cols.has('is_default_onboarding'),
    };
  }
  return sopsColumns;
}

// The real table uses `deleted_at IS NULL`, not `is_deleted = 0` — the old
// `s.deleted_at = 0` comparison silently matched nothing (or the wrong
// rows), which is why findAll()/findById() were returning empty results.
function normalizeSopRow(row, cols) {
  if (!row) return row;
  if (cols.code === 'sop_code' && row.sop_code !== undefined) {
    return { ...row, code: row.sop_code };
  }
  return row;
}

function notDeletedClause(cols, alias = 's') {
  return cols.softDelete === 'is_deleted'
    ? `(${alias}.is_deleted = 0 OR ${alias}.is_deleted IS NULL)`
    : `${alias}.deleted_at IS NULL`;
}

function restrictionWhere(user, cols, alias = 's') {
  if (!user || !cols.hasRestrictionType) return '';

  const role = user.role || '';
  if (role === 'super_admin' || role === 'admin') return '';

  const userDepartmentId = user.department_id || null;
  const userId = user.id || null;

  return `
    (
      ${alias}.restriction_type = 'public'
      OR (
        ${alias}.restriction_type = 'department'
        AND ${alias}.department_id = ?
      )
      OR (
        ${alias}.restriction_type = 'assigned'
        AND EXISTS (
          SELECT 1
          FROM sop_assignments sa
          LEFT JOIN assignment_departments ad ON ad.assignment_id = sa.id
          LEFT JOIN assignment_users au ON au.assignment_id = sa.id
          WHERE sa.sop_version_id = (
            SELECT current_version_id FROM sops WHERE id = ${alias}.id
          )
            AND sa.is_deleted = FALSE
            AND (
              au.user_id = ?
              OR ad.department_id = ?
            )
        )
      )
      OR (
        ${alias}.restriction_type = 'private'
        AND ${alias}.${cols.owner} = ?
      )
    )
  `;
}

// Builds an organizational scope filter based on the user's role and assigned
// business/departments. This is separate from restrictionWhere() which handles
// content-level visibility (public/private/department/assigned).
async function businessScopeWhere(user, cols, alias = 's') {
  if (!user || !cols.hasDepartment) return { sql: '', params: [] };

  const role = user.role || '';
  if (role === 'super_admin') return { sql: '', params: [] };

  if (role === 'admin') {
    if (!user.business_id) {
      return { sql: 'AND 1=0', params: [] };
    }
    return {
      sql: `AND (
        EXISTS (
          SELECT 1 FROM departments d
          WHERE d.id = ${alias}.department_id
            AND d.business_id = ?
        )
        OR EXISTS (
          SELECT 1
          FROM sop_assignments sa
          INNER JOIN sop_versions sv ON sv.sop_id = ${alias}.id
          INNER JOIN assignment_departments ad ON ad.assignment_id = sa.id
          INNER JOIN departments d ON d.id = ad.department_id
          WHERE sa.sop_version_id = sv.id
            AND sv.is_current = TRUE
            AND sv.deleted_at IS NULL
            AND sa.is_deleted = FALSE
            AND d.business_id = ?
        )
      )`,
      params: [user.business_id, user.business_id],
    };
  }

  if (role === 'department_head') {
    const scopedDeptIds = user.scoped_department_ids || (user.department_id ? [user.department_id] : []);
    if (!scopedDeptIds.length) {
      return { sql: 'AND 1=0', params: [] };
    }
    const placeholders = scopedDeptIds.map(() => '?').join(',');
    return {
      sql: `AND (
        ${alias}.department_id IN (${placeholders})
        OR EXISTS (
          SELECT 1
          FROM sop_assignments sa
          INNER JOIN sop_versions sv ON sv.sop_id = ${alias}.id
          INNER JOIN assignment_departments ad ON ad.assignment_id = sa.id
          WHERE sa.sop_version_id = sv.id
            AND sv.is_current = TRUE
            AND sv.deleted_at IS NULL
            AND sa.is_deleted = FALSE
            AND ad.department_id IN (${placeholders})
        )
      )`,
      params: [...scopedDeptIds, ...scopedDeptIds],
    };
  }

  return { sql: '', params: [] };
}

async function canAccessSop(sop, user) {
  if (!sop || !user) return false;
  const cols = await getSopsColumns();
  const restriction = sop.restriction_type;
  if (!restriction || !cols.hasRestrictionType) return true;

  const role = user.role || '';
  if (role === 'admin' || role === 'super_admin') return true;

  if (restriction === 'public') return true;
  if (restriction === 'department' && sop.department_id && user.department_id && sop.department_id === user.department_id) return true;
  if (restriction === 'private' && sop.owner_id && user.id && sop.owner_id === user.id) return true;

  if (restriction === 'assigned') {
    const versionId = await getCurrentVersionId(sop.id);
    if (!versionId) return false;
    const [assignments] = await db.query(`
      SELECT sa.id FROM sop_assignments sa
      WHERE sa.sop_version_id = ? AND sa.is_deleted = FALSE
    `, [versionId]);
    const assignmentIds = assignments.map((a) => a.id);
    if (!assignmentIds.length) return false;

    const placeholders = assignmentIds.map(() => '?').join(',');
    const [userLinks] = await db.query(`
      SELECT 1 FROM assignment_users WHERE assignment_id IN (${placeholders}) AND user_id = ?
    `, [...assignmentIds, user.id]);
    if (userLinks.length) return true;

    if (user.department_id) {
      const [deptLinks] = await db.query(`
        SELECT 1 FROM assignment_departments WHERE assignment_id IN (${placeholders}) AND department_id = ?
      `, [...assignmentIds, user.department_id]);
      if (deptLinks.length) return true;
    }
  }

  return false;
}

// department_id now matches BOTH the SOP's legacy single "owner" department
// (sops.department_id) AND any department it's been assigned to via the
// sop_assignments -> sop_versions -> assignment_departments join. Previously
// this only matched the owner column, so multi-department assignments were
// invisible in any department other than the one the SOP was created under.
//
// When department_id is provided, each row also gets `is_owner_department`
// (1/0) so callers (the hierarchy view) can visually distinguish "this
// department owns the SOP" from "this SOP was assigned here."
async function findAll(filters = {}) {
  const cols = await getSopsColumns();
  const { search, status, department_id, category_id, exclude_categorized, exclude_status, page = 1, limit = 20, user } = filters;
  // `exclude_categorized=true` returns only SOPs with no category (used by the
  // hierarchy "Uncategorized SOPs" section). The value may arrive as a string
  // from query params, so normalize both boolean and "true" string.
  const excludeCategorized = exclude_categorized === true || exclude_categorized === 'true';
  const offset = (page - 1) * limit;

  // is_assigned_department is purely about the sop_assignments /
  // assignment_departments join — it does NOT check the legacy
  // sops.department_id owner column. So a SOP gets the "Assigned" badge in
  // every department it was explicitly assigned to, including a department
  // that also happens to be its owner.
  const assignedFlagSelect = (department_id && cols.hasDepartment)
    ? `, EXISTS (
        SELECT 1
        FROM sop_assignments sa
        INNER JOIN sop_versions sv ON sv.sop_id = s.id
        INNER JOIN assignment_departments ad ON ad.assignment_id = sa.id
        WHERE sa.sop_version_id = sv.id
          AND sv.is_current = TRUE
          AND sv.deleted_at IS NULL
          AND sa.is_deleted = FALSE
          AND ad.department_id = ?
      ) AS is_assigned_department`
    : '';

  let sql = `
    SELECT s.*, d.name AS department_name, c.name AS category_name, u.full_name AS owner_name${assignedFlagSelect}
    FROM sops s
    LEFT JOIN departments d ON s.department_id = d.id
    LEFT JOIN categories c ON s.category_id = c.id
    LEFT JOIN users u ON s.${cols.owner} = u.id
    WHERE ${notDeletedClause(cols)}
  `;
  const params = [];

  // Must be pushed first: this placeholder sits in the SELECT clause, which
  // is textually before every other `?` added below.
  if (assignedFlagSelect) {
    params.push(department_id);
  }

  if (search) {
    sql += ' AND (s.title LIKE ? OR s.' + cols.code + ' LIKE ? OR s.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) {
    sql += ' AND s.status = ?';
    params.push(status);
  }
  if (exclude_status) {
    sql += ' AND s.status != ?';
    params.push(exclude_status);
  }
  if (department_id && cols.hasDepartment) {
    sql += ` AND (
      s.department_id = ?
      OR EXISTS (
        SELECT 1
        FROM sop_assignments sa
        INNER JOIN sop_versions sv ON sv.sop_id = s.id
        INNER JOIN assignment_departments ad ON ad.assignment_id = sa.id
        WHERE sa.sop_version_id = sv.id
          AND sv.is_current = TRUE
          AND sv.deleted_at IS NULL
          AND sa.is_deleted = FALSE
          AND ad.department_id = ?
      )
    )`;
    params.push(department_id, department_id);
  }
  if (category_id && cols.hasCategory) {
    sql += ' AND s.category_id = ?';
    params.push(category_id);
  }
  if (excludeCategorized && cols.hasCategory) {
    sql += ' AND s.category_id IS NULL';
  }

  const restrictionSql = restrictionWhere(user, cols, 's');
  if (restrictionSql) {
    sql += ' AND ' + restrictionSql;
    params.push(user.department_id, user.id, user.department_id, user.id);
  }

  const scope = await businessScopeWhere(user, cols, 's');
  if (scope.sql) {
    sql += ' ' + scope.sql;
    params.push(...scope.params);
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
    countSql += ` AND (
      s.department_id = ?
      OR EXISTS (
        SELECT 1
        FROM sop_assignments sa
        INNER JOIN sop_versions sv ON sv.sop_id = s.id
        INNER JOIN assignment_departments ad ON ad.assignment_id = sa.id
        WHERE sa.sop_version_id = sv.id
          AND sv.is_current = TRUE
          AND sv.deleted_at IS NULL
          AND sa.is_deleted = FALSE
          AND ad.department_id = ?
      )
    )`;
    countParams.push(department_id, department_id);
  }
  if (category_id && cols.hasCategory) {
    countSql += ' AND s.category_id = ?';
    countParams.push(category_id);
  }
  if (excludeCategorized && cols.hasCategory) {
    countSql += ' AND s.category_id IS NULL';
  }

  const countRestrictionSql = restrictionWhere(user, cols, 's');
  if (countRestrictionSql) {
    countSql += ' AND ' + countRestrictionSql;
    countParams.push(user.department_id, user.id, user.department_id, user.id);
  }

  const countScope = await businessScopeWhere(user, cols, 's');
  if (countScope.sql) {
    countSql += ' ' + countScope.sql;
    countParams.push(...countScope.params);
  }

  const [countRows] = await db.query(countSql, countParams);

  return {
    rows: rows.map((r) => normalizeSopRow(r, cols)),
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
  return normalizeSopRow(rows[0] || null, cols);
}

async function findByIdIncludingDeleted(id) {
  const cols = await getSopsColumns();
  const [rows] = await db.query(`
    SELECT s.*, d.name AS department_name, c.name AS category_name, u.full_name AS owner_name
    FROM sops s
    LEFT JOIN departments d ON s.department_id = d.id
    LEFT JOIN categories c ON s.category_id = c.id
    LEFT JOIN users u ON s.${cols.owner} = u.id
    WHERE s.id = ?
  `, [id]);
  return normalizeSopRow(rows[0] || null, cols);
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
    restriction_type,
    is_default_onboarding,
  } = data;

  const insertCols = ['title', cols.code, 'description', 'department_id', 'category_id', cols.owner, 'status'];
  const insertVals = [title, code || null, description || null, department_id || null, category_id || null, owner_user_id || null, status || 'Draft'];
  if (cols.hasRestrictionType) { insertCols.push('restriction_type'); insertVals.push(restriction_type || 'public'); }
  if (cols.hasDefaultOnboarding) { insertCols.push('is_default_onboarding'); insertVals.push(is_default_onboarding ? 1 : 0); }

  // The real table has BOTH owner_user_id (nullable) and owner_id
  // (NOT NULL, no default). getSopsColumns() only detects/writes whichever
  // one it picks as `cols.owner` (owner_user_id, since it exists) — leaving
  // owner_id NULL on insert, which fails under strict SQL mode. Mirror the
  // same value into owner_id whenever it isn't already the chosen column.
  if (cols.owner !== 'owner_id') {
    insertCols.push('owner_id');
    insertVals.push(owner_user_id || null);
  }

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
  if (cols.hasRestrictionType) { allowedFields.push('restriction_type'); }
  if (cols.hasDefaultOnboarding) { allowedFields.push('is_default_onboarding'); }
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      sets.push(`${field} = ?`);
      params.push(data[field]);
    }
  }

  if (data.owner_user_id !== undefined && cols.owner === 'owner_user_id') {
    sets.push('owner_user_id = ?');
    params.push(data.owner_user_id);
    if (data.owner_user_id != null) {
      // owner_id is NOT NULL on the real table — keep it mirrored.
      sets.push('owner_id = ?');
      params.push(data.owner_user_id);
    }
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

async function restore(id) {
  const cols = await getSopsColumns();
  if (cols.softDelete === 'is_deleted') {
    const [result] = await db.query('UPDATE sops SET is_deleted = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = TRUE', [id]);
    return result.affectedRows;
  }
  const [result] = await db.query('UPDATE sops SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NOT NULL', [id]);
  return result.affectedRows;
}

async function permanentDelete(id) {
  const [result] = await db.query('DELETE FROM sops WHERE id = ?', [id]);
  return result.affectedRows;
}

async function listTrashed(filters = {}) {
  const cols = await getSopsColumns();
  const { search, department_id, category_id, page = 1, limit = 20, user } = filters;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT s.*, d.name AS department_name, c.name AS category_name, u.full_name AS owner_name
    FROM sops s
    LEFT JOIN departments d ON s.department_id = d.id
    LEFT JOIN categories c ON s.category_id = c.id
    LEFT JOIN users u ON s.${cols.owner} = u.id
    WHERE ${cols.softDelete === 'is_deleted' ? 's.is_deleted = TRUE' : 's.deleted_at IS NOT NULL'}
  `;
  const params = [];

  if (search) {
    sql += ' AND (s.title LIKE ? OR s.' + cols.code + ' LIKE ? OR s.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (department_id && cols.hasDepartment) {
    sql += ' AND s.department_id = ?';
    params.push(department_id);
  }
  if (category_id && cols.hasCategory) {
    sql += ' AND s.category_id = ?';
    params.push(category_id);
  }

  const scope = await businessScopeWhere(user, cols, 's');
  if (scope.sql) {
    sql += ' ' + scope.sql;
    params.push(...scope.params);
  }

  sql += ' ORDER BY s.updated_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.query(sql, params);

  let countSql = `
    SELECT COUNT(*) AS total
    FROM sops s
    WHERE ${cols.softDelete === 'is_deleted' ? 's.is_deleted = TRUE' : 's.deleted_at IS NOT NULL'}
  `;
  const countParams = [];
  if (search) {
    countSql += ' AND (s.title LIKE ? OR s.' + cols.code + ' LIKE ? OR s.description LIKE ?)';
    countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (department_id && cols.hasDepartment) {
    countSql += ' AND s.department_id = ?';
    countParams.push(department_id);
  }
  if (category_id && cols.hasCategory) {
    countSql += ' AND s.category_id = ?';
    countParams.push(category_id);
  }

  const countScope = await businessScopeWhere(user, cols, 's');
  if (countScope.sql) {
    countSql += ' ' + countScope.sql;
    countParams.push(...countScope.params);
  }

  const [countRows] = await db.query(countSql, countParams);

  return {
    rows: rows.map((r) => normalizeSopRow(r, cols)),
    total: countRows[0]?.total ?? 0,
    page,
    limit,
    totalPages: Math.ceil((countRows[0]?.total ?? 0) / limit),
  };
}

module.exports = {
  findAll,
  findById,
  findByIdIncludingDeleted,
  findByCode,
  create,
  update,
  softDelete,
  restore,
  permanentDelete,
  listTrashed,
  getSopsColumns,
  restrictionWhere,
  canAccessSop,
  normalizeSopRow,
};
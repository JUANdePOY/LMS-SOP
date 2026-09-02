const db = require('../config/database');

function normalizeDate(value) {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  const str = String(value).trim();
  if (!str) return null;
  if (str.length >= 10) return str.slice(0, 10);
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

async function findByEmail(email) {
  const [rows] = await db.query(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await db.query(
    'SELECT * FROM users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

async function findByEmployeeId(employeeId) {
  const [rows] = await db.query(
    'SELECT * FROM users WHERE employee_id = ?',
    [employeeId]
  );
  return rows[0] || null;
}

// Lazy, cached resolution of the optional onboarding service. If the module is
// missing we warn exactly once and skip onboarding, instead of throwing and
// breaking user creation on every call.
let cachedOnboardingService;
let onboardingServiceResolved = false;
function getOnboardingService() {
  if (onboardingServiceResolved) return cachedOnboardingService;
  onboardingServiceResolved = true;
  try {
    cachedOnboardingService = require('../services/sopOnboardingService');
  } catch (err) {
    console.warn('[User Creating] sopOnboardingService not found; skipping onboarding assignment:', err.message);
    cachedOnboardingService = null;
  }
  return cachedOnboardingService;
}

async function create(userData) {
  const { full_name, email, password_hash, role, department_id, business_id, position_title, employee_id, contact_number, employment_status, date_hired, birthdate, address } = userData;
  const [result] = await db.query(
    `INSERT INTO users (full_name, email, password_hash, role, department_id, business_id, position_title, employee_id, contact_number, employment_status, date_hired, birthdate, address, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
    [full_name, email, password_hash, role, department_id ?? null, business_id ?? null, position_title ?? null, employee_id ?? null, contact_number ?? null, employment_status ?? 'Regular', normalizeDate(date_hired), normalizeDate(birthdate), address ?? null]
  );
  // Assign default onboarding SOPs to the new user
  const onboardingService = getOnboardingService();
  if (onboardingService && typeof onboardingService.assignOnboardingSopsToUser === 'function') {
    try {
      await onboardingService.assignOnboardingSopsToUser(result.insertId);
    } catch (onboardingErr) {
      console.error('[User Creating] Onboarding assignment failed:', onboardingErr);
    }
  }
  
  return result.insertId;
}

async function update(id, updates) {
  const allowed = ['full_name', 'email', 'role', 'department_id', 'business_id', 'position_title', 'employee_id', 'contact_number', 'employment_status', 'date_hired', 'birthdate', 'address', 'bio', 'cover_photo_url', 'is_active', 'avatar_url'];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      sets.push(`${key} = ?`);
      if (key === 'date_hired' || key === 'birthdate') {
        params.push(normalizeDate(updates[key]));
      } else {
        params.push(updates[key]);
      }
    }
  }
  if (!sets.length) return 0;
  params.push(id);
  const [result] = await db.query(
    `UPDATE users SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    params
  );
  return result.affectedRows;
}

async function updatePassword(id, passwordHash) {
  const [result] = await db.query(
    'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [passwordHash, id]
  );
  return result.affectedRows;
}

async function updateLastLogin(id) {
  await db.query(
    'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
}

async function listUsers(filters = {}) {
  const { search, role, department_id, business_id, employment_status, is_active, include_inactive, page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT
      u.id, u.full_name, u.email, u.role,
      u.department_id, d.name AS department_name,
      u.business_id, b.business_name,
      u.position_title, u.employee_id, u.contact_number,
      u.employment_status, u.date_hired, u.birthdate, u.address,
      u.avatar_url, u.cover_photo_url, u.bio,
      u.is_active, u.created_at, u.updated_at, u.last_login_at,
      u.full_name AS display_name
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN businesses b ON u.business_id = b.id
    WHERE 1 = 1
  `;
  const params = [];

  // By default only return active users. Pass include_inactive=true or
  // is_active explicitly to override (e.g. for an "include deactivated" view).
  if (is_active === false || is_active === 0 || is_active === 'false') {
    sql += ' AND u.is_active = FALSE';
  } else if (is_active === true || is_active === 1 || is_active === 'true') {
    sql += ' AND u.is_active = TRUE';
  } else if (!include_inactive) {
    sql += ' AND u.is_active = TRUE';
  }

  if (search) {
    sql += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.employee_id LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (role) {
    sql += ' AND u.role = ?';
    params.push(role);
  }
  if (department_id) {
    sql += ' AND u.department_id = ?';
    params.push(department_id);
  }
  if (business_id) {
    sql += ' AND u.business_id = ?';
    params.push(business_id);
  }
  if (employment_status) {
    sql += ' AND u.employment_status = ?';
    params.push(employment_status);
  }

  sql += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.query(sql, params);

  let countSql = `SELECT COUNT(*) AS total FROM users u WHERE 1 = 1`;
  const countParams = [];
  if (is_active === false || is_active === 0 || is_active === 'false') {
    countSql += ' AND u.is_active = FALSE';
  } else if (is_active === true || is_active === 1 || is_active === 'true') {
    countSql += ' AND u.is_active = TRUE';
  } else if (!include_inactive) {
    countSql += ' AND u.is_active = TRUE';
  }
  if (search) {
    countSql += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.employee_id LIKE ?)';
    countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (role) {
    countSql += ' AND u.role = ?';
    countParams.push(role);
  }
  if (department_id) {
    countSql += ' AND u.department_id = ?';
    countParams.push(department_id);
  }
  if (business_id) {
    countSql += ' AND u.business_id = ?';
    countParams.push(business_id);
  }
  if (employment_status) {
    countSql += ' AND u.employment_status = ?';
    countParams.push(employment_status);
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

async function getStats() {
  const [total] = await db.query('SELECT COUNT(*) AS count FROM users WHERE is_active = TRUE');
  const [active] = await db.query('SELECT COUNT(*) AS count FROM users WHERE is_active = TRUE AND role != "super_admin"');
  const [admins] = await db.query('SELECT COUNT(*) AS count FROM users WHERE role IN ("admin","department_head") AND is_active = TRUE');
  const [employees] = await db.query('SELECT COUNT(*) AS count FROM users WHERE role = "employee" AND is_active = TRUE');

  return {
    total: total[0]?.count ?? 0,
    active: active[0]?.count ?? 0,
    admins: admins[0]?.count ?? 0,
    employees: employees[0]?.count ?? 0,
  };
}

async function getUserLeaderboard(filters = {}) {
  const { period = 'all', business_id, department_id, limit = 20 } = filters;
  const validPeriods = ['all', 'week', 'month'];
  const safePeriod = validPeriods.includes(period) ? period : 'all';

  let dateFilter = '';
  if (safePeriod === 'week') {
    dateFilter = ' AND quiz_attempts.submitted_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK)';
  } else if (safePeriod === 'month') {
    dateFilter = ' AND quiz_attempts.submitted_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
  }

  let scopeCondition = '';
  const params = [];

  if (business_id) {
    scopeCondition = ' AND u.business_id = ?';
    params.push(business_id);
  }
  if (department_id) {
    scopeCondition = ' AND u.department_id = ?';
    params.push(department_id);
  }

  const [rows] = await db.query(
    `SELECT 
      u.id,
      u.full_name,
      COUNT(DISTINCT best.quiz_id) AS quizzes_completed,
      ROUND(AVG(best.pct), 1) AS points
    FROM users u
    JOIN (
      SELECT user_id, quiz_id, 
        ROUND(100.0 * MAX(score) / NULLIF(MAX(max_score), 0), 1) AS pct
      FROM quiz_attempts
      WHERE status IN ('completed', 'graded')
        AND is_deleted = FALSE
        AND score IS NOT NULL
        AND max_score IS NOT NULL
        AND max_score > 0
        ${dateFilter}
      GROUP BY user_id, quiz_id
    ) best ON best.user_id = u.id
    WHERE u.is_active = TRUE
      ${scopeCondition}
    GROUP BY u.id, u.full_name
    ORDER BY points DESC, u.full_name ASC
    LIMIT ?`,
    [...params, parseInt(limit, 10)]
  );

  return rows;
}

module.exports = {
  findByEmail,
  findById,
  findByEmployeeId,
  create,
  update,
  updatePassword,
  updateLastLogin,
  listUsers,
  getStats,
  getUserLeaderboard,
};
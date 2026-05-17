const pool = require('../config/database');

const EXTERNAL_STATUSES = ['draft', 'open', 'closed', 'completed'];

async function countExternal({ search, status }) {
  let sql = 'SELECT COUNT(*) AS total FROM external_trainings WHERE 1 = 1';
  const params = [];
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    sql += ' AND (title LIKE ? OR description LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q);
  }
  const [rows] = await pool.query(sql, params);
  return rows[0]?.total ?? 0;
}

async function findExternalMany({ page, limit, search, status }) {
  const offset = (page - 1) * limit;
  let sql = `
    SELECT id, title, description, start_date, start_time, venue, status, capacity,
           registration_fields, created_at, updated_at
    FROM external_trainings
    WHERE 1 = 1
  `;
  const params = [];
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    sql += ' AND (title LIKE ? OR description LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q);
  }
  sql += ' ORDER BY start_date DESC, id DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const [rows] = await pool.query(sql, params);
  return rows.map((r) => ({
    ...r,
    registration_fields:
      typeof r.registration_fields === 'string'
        ? safeJsonParse(r.registration_fields)
        : r.registration_fields,
  }));
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

async function findExternalById(id) {
  const [rows] = await pool.query(
    `SELECT id, title, description, start_date, start_time, venue, status, capacity,
            registration_fields, created_at, updated_at
     FROM external_trainings WHERE id = ?`,
    [id]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    ...r,
    registration_fields:
      typeof r.registration_fields === 'string'
        ? safeJsonParse(r.registration_fields)
        : r.registration_fields,
  };
}

async function insertExternal(row) {
  const rf =
    row.registration_fields == null
      ? null
      : typeof row.registration_fields === 'string'
        ? row.registration_fields
        : JSON.stringify(row.registration_fields);

  const [result] = await pool.query(
    `INSERT INTO external_trainings (
      title, description, start_date, start_time, venue, status, capacity, registration_fields
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.title,
      row.description ?? null,
      row.start_date,
      row.start_time ?? null,
      row.venue ?? null,
      row.status,
      row.capacity ?? null,
      rf,
    ]
  );
  return result.insertId;
}

async function updateExternal(id, patch) {
  const fields = [];
  const params = [];
  const map = {
    title: patch.title,
    description: patch.description,
    start_date: patch.start_date,
    start_time: patch.start_time,
    venue: patch.venue,
    status: patch.status,
    capacity: patch.capacity,
  };
  for (const [k, v] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      fields.push(`${k} = ?`);
      params.push(v ?? null);
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'registration_fields')) {
    fields.push('registration_fields = ?');
    const rf = patch.registration_fields;
    params.push(rf == null ? null : typeof rf === 'string' ? rf : JSON.stringify(rf));
  }
  if (!fields.length) return 0;
  params.push(id);
  const [result] = await pool.query(
    `UPDATE external_trainings SET ${fields.join(', ')} WHERE id = ?`,
    params
  );
  return result.affectedRows;
}

async function deleteExternal(id) {
  const [result] = await pool.query('DELETE FROM external_trainings WHERE id = ?', [id]);
  return result.affectedRows;
}

function isValidExternalStatus(s) {
  return EXTERNAL_STATUSES.includes(s);
}

module.exports = {
  countExternal,
  findExternalMany,
  findExternalById,
  insertExternal,
  updateExternal,
  deleteExternal,
  isValidExternalStatus,
  EXTERNAL_STATUSES,
};

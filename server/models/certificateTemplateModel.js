const db = require('../config/database');

async function findAll(filters = {}) {
  const { search, status, department_id, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  let sql = `
      SELECT t.id, t.public_id, t.name, t.department_id, t.frame_filename, t.frame_storage_path, t.frame_mime_type, t.frame_size, t.frame_original_name,
        t.orientation, t.width_px, t.height_px, t.sections, t.status, t.created_by, t.updated_by, t.created_at, t.updated_at, t.deleted_at, t.is_deleted,
           d.name AS department_name,
           creator.full_name AS created_by_name,
           updater.full_name AS updated_by_name
    FROM certificate_templates t
    LEFT JOIN departments d ON t.department_id = d.id
    LEFT JOIN users creator ON t.created_by = creator.id
    LEFT JOIN users updater ON t.updated_by = updater.id
    WHERE t.is_deleted = 0
  `;
  const params = [];

  if (search) {
    sql += ' AND (t.name LIKE ? OR t.public_id LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status && status !== 'all') {
    sql += ' AND t.status = ?';
    params.push(status);
  }
  if (department_id) {
    sql += ' AND t.department_id = ?';
    params.push(department_id);
  }

  sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.query(sql, params);

  for (const row of rows) {
    if (row.sections && typeof row.sections === 'string') {
      try {
        row.sections = JSON.parse(row.sections);
      } catch {
        row.sections = {};
      }
    }
  }

  let countSql = `SELECT COUNT(*) AS total FROM certificate_templates t WHERE t.is_deleted = 1=1`;
  const countParams = [];
  if (search) {
    countSql += ' AND (t.name LIKE ? OR t.public_id LIKE ?)';
    countParams.push(`%${search}%`, `%${search}%`);
  }
  if (status && status !== 'all') {
    countSql += ' AND t.status = ?';
    countParams.push(status);
  }
  if (department_id) {
    countSql += ' AND t.department_id = ?';
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

async function findByIdentifier(identifier) {
  const isNumeric = /^\d+$/.test(String(identifier));
    const sql = isNumeric
       ? `SELECT t.id, t.public_id, t.name, t.department_id, t.frame_filename, t.frame_storage_path, t.frame_data, t.frame_mime_type, t.frame_size, t.frame_original_name,
      t.orientation, t.width_px, t.height_px, t.sections, t.status, t.created_by, t.updated_by, t.created_at, t.updated_at, t.deleted_at, t.is_deleted,
      d.name AS department_name,
      creator.full_name AS created_by_name,
      updater.full_name AS updated_by_name
    FROM certificate_templates t
    LEFT JOIN departments d ON t.department_id = d.id
    LEFT JOIN users creator ON t.created_by = creator.id
    LEFT JOIN users updater ON t.updated_by = updater.id
    WHERE t.id = ? AND t.is_deleted = 0`
      : `SELECT t.id, t.public_id, t.name, t.department_id, t.frame_filename, t.frame_storage_path, t.frame_data, t.frame_mime_type, t.frame_size, t.frame_original_name,
      t.orientation, t.width_px, t.height_px, t.sections, t.status, t.created_by, t.updated_by, t.created_at, t.updated_at, t.deleted_at, t.is_deleted,
      d.name AS department_name,
      creator.full_name AS created_by_name,
      updater.full_name AS updated_by_name
    FROM certificate_templates t
    LEFT JOIN departments d ON t.department_id = d.id
    LEFT JOIN users creator ON t.created_by = creator.id
    LEFT JOIN users updater ON t.updated_by = updater.id
    WHERE t.public_id = ? AND t.is_deleted = 0`;

  const [rows] = await db.query(sql, [identifier]);
  const row = rows[0] || null;
  if (row && row.sections && typeof row.sections === 'string') {
    try { row.sections = JSON.parse(row.sections); } catch { row.sections = {}; }
  }
  return row;
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT t.id, t.public_id, t.name, t.department_id, t.frame_filename, t.frame_storage_path, t.frame_data, t.frame_mime_type, t.frame_size, t.frame_original_name,
            t.orientation, t.width_px, t.height_px, t.sections, t.status, t.created_by, t.updated_by, t.created_at, t.updated_at, t.deleted_at, t.is_deleted,
     d.name AS department_name,
     creator.full_name AS created_by_name,
     updater.full_name AS updated_by_name
     FROM certificate_templates t
     LEFT JOIN departments d ON t.department_id = d.id
     LEFT JOIN users creator ON t.created_by = creator.id
     LEFT JOIN users updater ON t.updated_by = updater.id
     WHERE t.id = ? AND t.is_deleted = 0`,
    [id]
  );
  const row = rows[0] || null;
  if (row && row.sections && typeof row.sections === 'string') {
    try { row.sections = JSON.parse(row.sections); } catch { row.sections = {}; }
  }
  return row;
}

async function create(data) {
  const {
    public_id, name, department_id, frame_filename, frame_storage_path,
    orientation, width_px, height_px, sections, status, created_by,
  } = data;
  const { frame_data, frame_mime_type, frame_size, frame_original_name } = data;

  const [result] = await db.query(
    `INSERT INTO certificate_templates
       (public_id, name, department_id, frame_filename, frame_storage_path, frame_data, frame_mime_type, frame_size, frame_original_name,
        orientation, width_px, height_px, sections, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      public_id, name, department_id ?? null, frame_filename, frame_storage_path,
      frame_data || null, frame_mime_type || null, frame_size || null, frame_original_name || null,
      orientation || 'landscape', width_px, height_px, JSON.stringify(sections),
      status || 'draft', created_by,
    ]
  );
  return result.insertId;
}

async function update(id, updates) {
  const allowed = [
    'name', 'department_id', 'frame_filename', 'frame_storage_path',
    'frame_data', 'frame_mime_type', 'frame_size', 'frame_original_name',
    'orientation', 'width_px', 'height_px', 'sections', 'status', 'updated_by',
  ];
  const sets = [];
  const params = [];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      let value = updates[key];
      if (key === 'sections') {
        value = JSON.stringify(value);
      }
      sets.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (!sets.length) return 0;

  sets.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  const [result] = await db.query(
    `UPDATE certificate_templates SET ${sets.join(', ')} WHERE id = ?`,
    params
  );
  return result.affectedRows;
}

async function softDelete(id) {
  const [result] = await db.query(
    `UPDATE certificate_templates SET is_deleted = 1, deleted_at = NOW(), updated_at = NOW() WHERE id = ?`,
    [id]
  );
  return result.affectedRows;
}

async function getStats() {
  const [rows] = await db.query(
    `SELECT status, COUNT(*) AS count
     FROM certificate_templates
     WHERE is_deleted = 0
     GROUP BY status`
  );
  return rows;
}

module.exports = {
  findAll,
  findById,
  findByIdentifier,
  create,
  update,
  softDelete,
  getStats,
};

const db = require('../config/database');

async function findAll(filters = {}) {
  const { search, type, limit = 100 } = filters;
  const limitNum = Math.min(parseInt(limit, 10) || 100, 500);

  let sql = `
    SELECT s.*,
           u.full_name AS user_name
    FROM certificate_signatures s
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.is_deleted = 0
  `;
  const params = [];

  if (search) {
    sql += ' AND (s.label LIKE ?)';
    params.push(`%${search}%`);
  }
  if (type && type !== 'all') {
    sql += ' AND s.type = ?';
    params.push(type);
  }

  sql += ' ORDER BY s.is_default DESC, s.created_at DESC LIMIT ?';
  params.push(limitNum);

  const [rows] = await db.query(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT s.*,
            u.full_name AS user_name
     FROM certificate_signatures s
     LEFT JOIN users u ON s.user_id = u.id
     WHERE s.id = ? AND s.is_deleted = 0`,
    [id]
  );
  return rows[0] || null;
}

async function create(data) {
  const {
    user_id,
    label,
    type,
    filename,
    storage_path,
    signature_data,
    signature_mime_type,
    signature_size,
    signature_original_name,
    is_default,
  } = data;

  const [result] = await db.query(
    `INSERT INTO certificate_signatures
       (user_id, label, type, filename, storage_path, signature_data, signature_mime_type, signature_size, signature_original_name, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user_id ?? null,
      label,
      type || 'signature',
      filename,
      storage_path || null,
      signature_data || null,
      signature_mime_type || null,
      signature_size || null,
      signature_original_name || null,
      is_default ? 1 : 0,
    ]
  );
  return result.insertId;
}

async function update(id, updates) {
  const allowed = ['label', 'type', 'is_default', 'user_id'];
  const sets = [];
  const params = [];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      let value = updates[key];
      if (key === 'is_default') {
        value = value ? 1 : 0;
      }
      if (key === 'user_id' && value === undefined) {
        value = null;
      }
      sets.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (!sets.length) return 0;

  params.push(id);
  const [result] = await db.query(
    `UPDATE certificate_signatures SET ${sets.join(', ')} WHERE id = ?`,
    params
  );
  return result.affectedRows;
}

async function softDelete(id) {
  const [result] = await db.query(
    `UPDATE certificate_signatures SET is_deleted = 1, deleted_at = NOW() WHERE id = ?`,
    [id]
  );
  return result.affectedRows;
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  softDelete,
};

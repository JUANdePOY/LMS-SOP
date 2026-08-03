const db = require('../config/database');

async function findAll(filters = {}) {
  const { template_id, user_id, status, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT i.*,
           t.name AS template_name,
           t.public_id AS template_public_id,
           u.full_name AS user_name,
           issuer.full_name AS issued_by_name
    FROM certificate_issuances i
    LEFT JOIN certificate_templates t ON i.template_id = t.id AND t.is_deleted = 0
    LEFT JOIN users u ON i.user_id = u.id
    LEFT JOIN users issuer ON i.issued_by = issuer.id
    WHERE 1 = 1
  `;
  const params = [];

  if (template_id) {
    sql += ' AND i.template_id = ?';
    params.push(template_id);
  }
  if (user_id) {
    sql += ' AND i.user_id = ?';
    params.push(user_id);
  }
  if (status && status !== 'all') {
    sql += ' AND i.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY i.issued_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.query(sql, params);

  let countSql = `SELECT COUNT(*) AS total FROM certificate_issuances i WHERE 1=1`;
  const countParams = [];
  if (template_id) {
    countSql += ' AND i.template_id = ?';
    countParams.push(template_id);
  }
  if (user_id) {
    countSql += ' AND i.user_id = ?';
    countParams.push(user_id);
  }
  if (status && status !== 'all') {
    countSql += ' AND i.status = ?';
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
    `SELECT i.*,
            t.name AS template_name,
            t.public_id AS template_public_id,
            u.full_name AS user_name,
            issuer.full_name AS issued_by_name
     FROM certificate_issuances i
     LEFT JOIN certificate_templates t ON i.template_id = t.id AND t.is_deleted = 0
     LEFT JOIN users u ON i.user_id = u.id
     LEFT JOIN users issuer ON i.issued_by = issuer.id
     WHERE i.id = ?`,
    [id]
  );
  const row = rows[0] || null;
  if (row && row.resolved_sections && typeof row.resolved_sections === 'string') {
    try { row.resolved_sections = JSON.parse(row.resolved_sections); } catch { row.resolved_sections = {}; }
  }
  return row;
}

async function findByCertificateNumber(certificateNumber) {
  const [rows] = await db.query(
    `SELECT i.*,
            t.name AS template_name,
            t.public_id AS template_public_id,
            u.full_name AS user_name,
            issuer.full_name AS issued_by_name
     FROM certificate_issuances i
     LEFT JOIN certificate_templates t ON i.template_id = t.id AND t.is_deleted = 0
     LEFT JOIN users u ON i.user_id = u.id
     LEFT JOIN users issuer ON i.issued_by = issuer.id
     WHERE i.certificate_number = ?`,
    [certificateNumber]
  );
  const row = rows[0] || null;
  if (row && row.resolved_sections && typeof row.resolved_sections === 'string') {
    try { row.resolved_sections = JSON.parse(row.resolved_sections); } catch { row.resolved_sections = {}; }
  }
  return row;
}

async function create(data) {
  const {
    certificate_number, template_id, user_id, resolved_sections,
    pdf_storage_path, status, issued_by, expires_at, title, data_snapshot,
  } = data;

  const [result] = await db.query(
    `INSERT INTO certificate_issuances
       (certificate_number, template_id, user_id, resolved_sections,
        pdf_storage_path, status, issued_by, expires_at, title, data_snapshot)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      certificate_number, template_id, user_id,
      JSON.stringify(resolved_sections),
      pdf_storage_path || null,
      status || 'active',
      issued_by ?? null,
      expires_at || null,
      title || null,
      data_snapshot ? JSON.stringify(data_snapshot) : null,
    ]
  );
  return result.insertId;
}

async function updateStatus(id, status, revokedAt = null) {
  const [result] = await db.query(
    `UPDATE certificate_issuances
     SET status = ?, revoked_at = ?
     WHERE id = ?`,
    [status, revokedAt, id]
  );
  return result.affectedRows;
}

module.exports = {
  findAll,
  findById,
  findByCertificateNumber,
  create,
  updateStatus,
};

const pool = require('../config/database');

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function clampLimit(limit) {
  const n = parseInt(limit, 10);
  if (Number.isNaN(n)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, n));
}

async function searchSquadrons({ search, limit }) {
  const l = clampLimit(limit);
  const q = search && String(search).trim() ? `%${String(search).trim()}%` : '%';
  const [rows] = await pool.query(
    `SELECT id, name, code, group_id
     FROM squadron
     WHERE is_active = 1
       AND (name LIKE ? OR IFNULL(code, '') LIKE ?)
     ORDER BY name ASC
     LIMIT ?`,
    [q, q, l]
  );
  return rows;
}

async function searchReservistsForSquadron({ squadronId, search, limit }) {
  const l = clampLimit(limit);
  const sid = Number(squadronId);
  if (!sid) return [];
  const term = search && String(search).trim() ? `%${String(search).trim()}%` : '%';
  const [rows] = await pool.query(
    `SELECT r.id, r.first_name, r.last_name, r.rank, r.service_number
     FROM reservist_assignments ra
     INNER JOIN reservists r ON r.id = ra.reservist_id
     WHERE ra.squadron_id = ?
       AND r.is_active = 1
       AND (
         CONCAT(r.first_name, ' ', r.last_name) LIKE ?
         OR r.service_number LIKE ?
         OR IFNULL(r.rank, '') LIKE ?
       )
     ORDER BY r.last_name ASC, r.first_name ASC
     LIMIT ?`,
    [sid, term, term, term, l]
  );
  return rows;
}

module.exports = {
  searchSquadrons,
  searchReservistsForSquadron,
};

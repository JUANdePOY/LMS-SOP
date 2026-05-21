const db = require('../config/database');
const pool = db;

async function deleteByTrainingId(conn, trainingId) {
  const executor = conn || pool;
  await executor.query('DELETE FROM internal_training_participants WHERE training_id = ?', [trainingId]);
}

async function hasAssignment(conn, reservistId, squadronId) {
  const executor = conn || pool;
  const [rows] = await executor.query(
    'SELECT 1 FROM reservist_assignments WHERE reservist_id = ? AND squadron_id = ? LIMIT 1',
    [reservistId, squadronId]
  );
  return rows.length > 0;
}

async function insertMany(conn, trainingId, rows) {
  if (!rows.length) return;
  const executor = conn || pool;
  const tuples = [];
  const params = [];
  for (const r of rows) {
    tuples.push('(?, ?, ?)');
    params.push(trainingId, r.reservist_id, r.squadron_id);
  }
  const sql = `INSERT INTO internal_training_participants (training_id, reservist_id, squadron_id) VALUES ${tuples.join(', ')}`;
  await executor.query(sql, params);
}

/**
 * Returns rows joined for grouping: one row per (training, reservist, squadron) with labels.
 */
async function listFlatWithLabels(trainingId) {
  const [rows] = await pool.query(
    `SELECT
       itp.squadron_id,
       s.name AS squadron_name,
       itp.reservist_id,
       r.first_name,
       r.last_name,
       r.rank,
       r.service_number
     FROM internal_training_participants itp
     INNER JOIN squadron s ON s.id = itp.squadron_id
     INNER JOIN reservists r ON r.id = itp.reservist_id
     WHERE itp.training_id = ?
     ORDER BY s.name ASC, r.last_name ASC, r.first_name ASC`,
    [trainingId]
  );
  return rows;
}

function groupBySquadron(flatRows) {
  const map = new Map();
  for (const row of flatRows) {
    if (!map.has(row.squadron_id)) {
      map.set(row.squadron_id, {
        squadron_id: row.squadron_id,
        squadron_name: row.squadron_name,
        reservists: [],
      });
    }
    map.get(row.squadron_id).reservists.push({
      id: row.reservist_id,
      first_name: row.first_name,
      last_name: row.last_name,
      rank: row.rank,
      service_number: row.service_number,
    });
  }
  return Array.from(map.values());
}

module.exports = {
  pool,
  deleteByTrainingId,
  hasAssignment,
  insertMany,
  listFlatWithLabels,
  groupBySquadron,
};

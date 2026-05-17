const pool = require('../config/database');
const { parseActivityMeta, buildActivityDescription } = require('../utils/activityMeta');

function mapActivityRow(row, trainingStatus) {
  if (!row) return null;
  const meta = parseActivityMeta(row.description);
  return {
    id: row.id,
    training_id: row.training_id,
    title: row.title,
    description: row.description,
    start_time: row.start_time,
    end_time: row.end_time,
    start_datetime: row.start_time,
    end_datetime: row.end_time,
    location: row.location,
    venue: row.location,
    instructor: row.instructor,
    type: meta.activityType || null,
    requirements: meta.requirements || null,
    status: trainingStatus || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function listByTrainingId(trainingId, trainingStatus = null) {
  const [rows] = await pool.query(
    `SELECT id, training_id, title, description, start_time, end_time, location, instructor,
            created_at, updated_at
     FROM activities
     WHERE training_id = ?
     ORDER BY start_time ASC, id ASC`,
    [trainingId]
  );
  return rows.map((r) => mapActivityRow(r, trainingStatus));
}

async function findById(activityId, trainingId) {
  const [rows] = await pool.query(
    `SELECT id, training_id, title, description, start_time, end_time, location, instructor,
            created_at, updated_at
     FROM activities WHERE id = ? AND training_id = ?`,
    [activityId, trainingId]
  );
  return rows[0] || null;
}

async function insertActivity(conn, row) {
  const sql = `
    INSERT INTO activities (
      training_id, title, description, start_time, end_time, location, instructor
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    row.training_id,
    row.title,
    row.description ?? null,
    row.start_time,
    row.end_time,
    row.location ?? null,
    row.instructor ?? null,
  ];
  const executor = conn || pool;
  const [result] = await executor.query(sql, params);
  return result.insertId;
}

async function updateActivity(activityId, trainingId, patch, conn = null) {
  const allowed = ['title', 'description', 'start_time', 'end_time', 'location', 'instructor'];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      sets.push(`${key} = ?`);
      params.push(patch[key]);
    }
  }
  if (!sets.length) return 0;
  params.push(activityId, trainingId);
  const executor = conn || pool;
  const [result] = await executor.query(
    `UPDATE activities SET ${sets.join(', ')} WHERE id = ? AND training_id = ?`,
    params
  );
  return result.affectedRows;
}

async function deleteActivity(activityId, trainingId) {
  const [result] = await pool.query('DELETE FROM activities WHERE id = ? AND training_id = ?', [
    activityId,
    trainingId,
  ]);
  return result.affectedRows;
}

async function getPrimaryActivityId(trainingId) {
  const [rows] = await pool.query(
    'SELECT MIN(id) AS id FROM activities WHERE training_id = ?',
    [trainingId]
  );
  return rows[0]?.id ?? null;
}

module.exports = {
  listByTrainingId,
  findById,
  insertActivity,
  updateActivity,
  deleteActivity,
  getPrimaryActivityId,
  mapActivityRow,
  parseActivityMeta,
  buildActivityDescription,
};

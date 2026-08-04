const db = require('../config/database');

async function listHierarchy(quizId) {
  const [rows] = await db.query(
    'SELECT * FROM quiz_hierarchy WHERE quiz_id = ? AND parent_id IS NULL ORDER BY level ASC, name ASC',
    [quizId]
  );
  return rows;
}

async function listChildren(parentId) {
  const [rows] = await db.query(
    'SELECT * FROM quiz_hierarchy WHERE parent_id = ? ORDER BY level ASC, name ASC',
    [parentId]
  );
  return rows;
}

async function findById(id) {
  const [rows] = await db.query(
    'SELECT * FROM quiz_hierarchy WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function create(data) {
  const { quiz_id, parent_id, name, description, level } = data;
  const [result] = await db.query(
    `INSERT INTO quiz_hierarchy (quiz_id, parent_id, name, description, level)
     VALUES (?, ?, ?, ?, ?)`,
    [quiz_id, parent_id || null, name, description || null, level || 1]
  );
  return result.insertId;
}

async function update(id, updates) {
  const allowed = ['name', 'description', 'level', 'parent_id'];
  const sets = [];
  const params = [];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      sets.push(`${key} = ?`);
      params.push(updates[key]);
    }
  }

  if (!sets.length) return 0;
  params.push(id);

  const [result] = await db.query(
    `UPDATE quiz_hierarchy SET ${sets.join(', ')} WHERE id = ?`,
    params
  );
  return result.affectedRows;
}

async function remove(id) {
  const [result] = await db.query(
    'DELETE FROM quiz_hierarchy WHERE id = ?',
    [id]
  );
  return result.affectedRows;
}

async function listForSelect(quizId) {
  const [rows] = await db.query(
    'SELECT id, name, parent_id, level FROM quiz_hierarchy WHERE quiz_id = ? ORDER BY level ASC, name ASC',
    [quizId]
  );
  return rows;
}

module.exports = {
  listHierarchy,
  listChildren,
  findById,
  create,
  update,
  remove,
  listForSelect,
};

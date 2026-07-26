const db = require('../config/database');

async function getSections(sopId) {
  const [rows] = await db.query(`
    SELECT *
    FROM sop_sections
    WHERE sop_id = ? AND is_deleted = FALSE
    ORDER BY order_index ASC, id ASC
  `, [sopId]);
  return rows;
}

async function getSectionById(id) {
  const [rows] = await db.query('SELECT * FROM sop_sections WHERE id = ? AND is_deleted = FALSE', [id]);
  return rows[0] || null;
}

async function createSection(data) {
  const { sop_id, title, section_type, content, order_index = 0 } = data;
  const [result] = await db.query(`
    INSERT INTO sop_sections (sop_id, title, section_type, content, order_index, is_deleted, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [sop_id, title, section_type, content || null, order_index]);
  return result.insertId;
}

async function updateSection(id, data) {
  const sets = [];
  const params = [];
  for (const field of ['title', 'section_type', 'content', 'order_index']) {
    if (data[field] !== undefined) {
      sets.push(`${field} = ?`);
      params.push(data[field]);
    }
  }
  if (!sets.length) return 0;
  params.push(id);
  const [result] = await db.query(`UPDATE sop_sections SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
  return result.affectedRows;
}

async function deleteSection(id) {
  const [result] = await db.query('UPDATE sop_sections SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  return result.affectedRows;
}

async function getSteps(sopId) {
  const [rows] = await db.query(`
    SELECT *
    FROM sop_steps
    WHERE sop_id = ? AND is_deleted = FALSE
    ORDER BY order_index ASC, id ASC
  `, [sopId]);
  return rows;
}

async function getStepById(id) {
  const [rows] = await db.query('SELECT * FROM sop_steps WHERE id = ? AND is_deleted = FALSE', [id]);
  return rows[0] || null;
}

async function createStep(data) {
  const { sop_id, section_id, title, description, order_index = 0, step_number = 1 } = data;
  const [result] = await db.query(`
    INSERT INTO sop_steps (sop_id, section_id, title, description, step_number, order_index, is_deleted, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [sop_id, section_id || null, title, description || null, step_number, order_index]);
  return result.insertId;
}

async function updateStep(id, data) {
  const sets = [];
  const params = [];
  for (const field of ['section_id', 'title', 'description', 'step_number', 'order_index']) {
    if (data[field] !== undefined) {
      sets.push(`${field} = ?`);
      params.push(data[field]);
    }
  }
  if (!sets.length) return 0;
  params.push(id);
  const [result] = await db.query(`UPDATE sop_steps SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
  return result.affectedRows;
}

async function deleteStep(id) {
  const [result] = await db.query('UPDATE sop_steps SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  return result.affectedRows;
}

module.exports = {
  getSections,
  getSectionById,
  createSection,
  updateSection,
  deleteSection,
  getSteps,
  getStepById,
  createStep,
  updateStep,
  deleteStep,
};

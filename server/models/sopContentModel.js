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
    INSERT INTO sop_sections (sop_id, title, section_type, content, order_index)
    VALUES (?, ?, ?, ?, ?)
  `, [sop_id, title || null, section_type, content || '', order_index]);
  return result.insertId;
}

async function updateSection(id, data) {
  const fieldMap = { title: 'title', section_type: 'section_type', content: 'content', order_index: 'order_index' };
  const sets = [];
  const params = [];
  for (const [inputField, column] of Object.entries(fieldMap)) {
    if (data[inputField] !== undefined) {
      sets.push(`${column} = ?`);
      params.push(data[inputField]);
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
  const { sop_id, section_id, title, description, order_index = 0, step_number = 1, estimated_minutes } = data;
  const [result] = await db.query(`
    INSERT INTO sop_steps (sop_id, section_id, step_number, title, description, estimated_minutes, order_index)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [sop_id, section_id || null, step_number, title || null, description || '', estimated_minutes || null, order_index]);
  return result.insertId;
}

async function updateStep(id, data) {
  const fieldMap = {
    title: 'title',
    description: 'description',
    step_number: 'step_number',
    order_index: 'order_index',
    estimated_minutes: 'estimated_minutes',
    section_id: 'section_id',
  };
  const sets = [];
  const params = [];
  for (const [inputField, column] of Object.entries(fieldMap)) {
    if (data[inputField] !== undefined) {
      sets.push(`${column} = ?`);
      params.push(data[inputField]);
    }
  }
  if (!sets.length) return 0;
  params.push(id);
  const [result] = await db.query(`UPDATE sop_steps SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = FALSE`, params);
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
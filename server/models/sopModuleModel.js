const db = require('../config/database');

async function getColumns(table) {
  const [rows] = await db.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
  `, [table]);
  return new Set(rows.map(r => r.COLUMN_NAME));
}

let modulesColumns = null;
async function getModulesColumns() {
  if (!modulesColumns) {
    const cols = await getColumns('sop_modules');
    modulesColumns = {
      softDelete: cols.has('is_deleted') ? 'is_deleted' : 'deleted_at',
      hasUpdatedBy: cols.has('updated_by'),
      hasSortOrder: cols.has('sort_order'),
    };
  }
  return modulesColumns;
}

function notDeletedClause(cols, alias = 'm') {
  return cols.softDelete === 'is_deleted'
    ? `(${alias}.is_deleted = 0 OR ${alias}.is_deleted IS NULL)`
    : `${alias}.deleted_at IS NULL`;
}

async function listModules(sopId) {
  const cols = await getModulesColumns();
  const [rows] = await db.query(`
    SELECT m.*
    FROM sop_modules m
    WHERE m.sop_id = ? AND ${notDeletedClause(cols)}
    ORDER BY m.sort_order ASC, m.id ASC
  `, [sopId]);
  return rows;
}

async function getModuleById(moduleId) {
  const cols = await getModulesColumns();
  const [rows] = await db.query(`
    SELECT m.*
    FROM sop_modules m
    WHERE m.id = ? AND ${notDeletedClause(cols)}
  `, [moduleId]);
  return rows[0] || null;
}

async function createModule(data) {
  const { sop_id, title, content, sort_order, created_by } = data;
  const cols = await getModulesColumns();

  const insertCols = ['sop_id', 'title', 'content', 'sort_order', 'created_by'];
  const insertVals = [sop_id, title || null, content || null, sort_order || 1, created_by || null];

  if (cols.hasUpdatedBy) {
    insertCols.push('updated_by');
    insertVals.push(created_by || null);
  }

  const [result] = await db.query(
    `INSERT INTO sop_modules (${insertCols.join(', ')}) VALUES (${insertCols.map(() => '?').join(', ')})`,
    insertVals
  );
  return result.insertId;
}

async function updateModule(moduleId, data) {
  const cols = await getModulesColumns();
  const sets = [];
  const params = [];

  if (data.title !== undefined) { sets.push('title = ?'); params.push(data.title); }
  if (data.content !== undefined) { sets.push('content = ?'); params.push(data.content); }
  if (data.sort_order !== undefined) { sets.push('sort_order = ?'); params.push(data.sort_order); }
  if (data.updated_by !== undefined && cols.hasUpdatedBy) { sets.push('updated_by = ?'); params.push(data.updated_by); }

  if (!sets.length) return 0;

  sets.push('updated_at = CURRENT_TIMESTAMP');
  params.push(moduleId);

  const [result] = await db.query(`UPDATE sop_modules SET ${sets.join(', ')} WHERE id = ?`, params);
  return result.affectedRows;
}

async function deleteModule(moduleId) {
  const cols = await getModulesColumns();
  if (cols.softDelete === 'is_deleted') {
    const [result] = await db.query('UPDATE sop_modules SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [moduleId]);
    return result.affectedRows;
  }
  const [result] = await db.query('UPDATE sop_modules SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [moduleId]);
  return result.affectedRows;
}

async function restoreModule(moduleId) {
  const cols = await getModulesColumns();
  if (cols.softDelete === 'is_deleted') {
    const [result] = await db.query('UPDATE sop_modules SET is_deleted = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = TRUE', [moduleId]);
    return result.affectedRows;
  }
  const [result] = await db.query('UPDATE sop_modules SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NOT NULL', [moduleId]);
  return result.affectedRows;
}

async function permanentDeleteModule(moduleId) {
  const [result] = await db.query('DELETE FROM sop_modules WHERE id = ?', [moduleId]);
  return result.affectedRows;
}

async function listTrashedModules(sopId) {
  const cols = await getModulesColumns();
  const deletedClause = cols.softDelete === 'is_deleted' ? 'm.is_deleted = TRUE' : 'm.deleted_at IS NOT NULL';
  const [rows] = await db.query(`
    SELECT m.*
    FROM sop_modules m
    WHERE m.sop_id = ? AND ${deletedClause}
    ORDER BY m.sort_order ASC, m.id ASC
  `, [sopId]);
  return rows;
}

async function updateSortOrder(sopId, moduleOrders) {
  const cols = await getModulesColumns();
  for (const { moduleId, sortOrder } of moduleOrders) {
    await db.query('UPDATE sop_modules SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND sop_id = ?', [sortOrder, moduleId, sopId]);
  }
  return true;
}

module.exports = {
  listModules,
  getModuleById,
  createModule,
  updateModule,
  deleteModule,
  restoreModule,
  permanentDeleteModule,
  listTrashedModules,
  updateSortOrder,
};
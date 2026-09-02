const db = require('../config/database');

const PROJECT_STATUSES = ['planning', 'active', 'on_hold', 'completed', 'cancelled'];
const PROJECT_VIEW_TYPES = ['list', 'board', 'table', 'timeline', 'calendar', 'workload', 'whiteboard'];
const DEFAULT_VIEWS = ['list', 'board', 'table', 'timeline', 'calendar', 'workload'];
const FIELD_TYPES = ['text', 'number', 'select', 'multiselect', 'date', 'user'];

function parseJsonOrNull(v) {
  if (v == null) return null;
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return null; }
  }
  return v;
}

function normalizeViews(views) {
  if (!Array.isArray(views) || views.length === 0) return [...DEFAULT_VIEWS];
  const valid = views.filter((v) => PROJECT_VIEW_TYPES.includes(v));
  return valid.length > 0 ? valid : [...DEFAULT_VIEWS];
}

async function create({
  client_business_id, name, description, status, start_date, due_date, color, enabled_views, created_by,
}) {
  const [result] = await db.query(
    `INSERT INTO projects
       (client_business_id, name, description, status, start_date, due_date, color, enabled_views, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      client_business_id,
      name,
      description || null,
      status || 'planning',
      start_date || null,
      due_date || null,
      color || '#C14E08',
      JSON.stringify(normalizeViews(enabled_views)),
      created_by || null,
    ]
  );
  return result.insertId;
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT p.*, u.full_name AS created_by_name,
            cb.business_name AS client_business_name, cb.client_id,
            c.client_name
     FROM projects p
     LEFT JOIN users u ON p.created_by = u.id
     LEFT JOIN client_businesses cb ON p.client_business_id = cb.id
     LEFT JOIN clients c ON cb.client_id = c.id
     WHERE p.id = ?`,
    [id]
  );
  const project = rows[0];
  if (!project) return null;

  const [[countRow]] = await db.query(
    'SELECT COUNT(*) AS task_count FROM tasks WHERE project_id = ?',
    [id]
  );
  const fields = await listFieldDefs(id);
  project.task_count = countRow?.task_count ?? 0;
  project.custom_fields = fields;
  project.enabled_views = normalizeViews(parseJsonOrNull(project.enabled_views));
  return project;
}

async function findByClientBusiness(clientBusinessId) {
  const [rows] = await db.query(
    `SELECT p.*,
            (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) AS task_count
     FROM projects p
     WHERE p.client_business_id = ?
     ORDER BY p.name ASC`,
    [clientBusinessId]
  );
  return rows.map((r) => ({
    ...r,
    enabled_views: normalizeViews(parseJsonOrNull(r.enabled_views)),
  }));
}

async function getTree() {
  const [rows] = await db.query(
    `SELECT c.id AS client_id, c.client_name, c.color AS client_color,
            c.business_id AS client_business_id,
            c.department_id AS client_department_id,
            b.business_name AS client_business_name,
            cb.id AS business_id, cb.business_name,
            p.id AS project_id, p.name AS project_name, p.status AS project_status,
            p.color AS project_color, p.due_date AS project_due_date
     FROM clients c
     LEFT JOIN businesses b ON b.id = c.business_id
     LEFT JOIN client_businesses cb ON cb.client_id = c.id
     LEFT JOIN projects p ON p.client_business_id = cb.id
     ORDER BY c.client_name ASC, cb.business_name ASC, p.name ASC`
  );

  const clientsMap = new Map();
  for (const row of rows) {
    if (!clientsMap.has(row.client_id)) {
      clientsMap.set(row.client_id, {
        id: row.client_id,
        client_name: row.client_name,
        business_id: row.client_business_id != null ? Number(row.client_business_id) : null,
        department_id: row.client_department_id != null ? Number(row.client_department_id) : null,
        business_name: row.client_business_name || null,
        color: row.client_color || null,
        businesses: new Map(),
      });
    }
    // Clients without any client_businesses row yet still appear in the tree
    // (so a freshly created client shows up even before businesses/projects
    // are added), but they have no business/branch to render.
    if (row.business_id == null) continue;
    const client = clientsMap.get(row.client_id);
    if (!client.businesses.has(row.business_id)) {
      client.businesses.set(row.business_id, {
        id: row.business_id,
        business_name: row.business_name,
        projects: [],
      });
    }
    if (row.project_id != null) {
      client.businesses.get(row.business_id).projects.push({
        id: row.project_id,
        name: row.project_name,
        status: row.project_status,
        color: row.project_color,
        due_date: row.project_due_date,
      });
    }
  }

  return Array.from(clientsMap.values()).map((client) => ({
    id: client.id,
    client_name: client.client_name,
    business_id: client.business_id,
    department_id: client.department_id,
    business_name: client.business_name,
    color: client.color,
    businesses: Array.from(client.businesses.values()),
  }));
}

async function update(id, data) {
  const allowed = ['name', 'description', 'status', 'start_date', 'due_date', 'color', 'enabled_views'];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
    if (key === 'enabled_views') {
      sets.push('enabled_views = ?');
      params.push(JSON.stringify(normalizeViews(data.enabled_views)));
    } else {
      sets.push(`${key} = ?`);
      params.push(data[key] === undefined ? null : data[key]);
    }
  }
  if (!sets.length) return 0;
  params.push(id);
  const [result] = await db.query(
    `UPDATE projects SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    params
  );
  return result.affectedRows;
}

async function remove(id) {
  const [result] = await db.query('DELETE FROM projects WHERE id = ?', [id]);
  return result.affectedRows;
}

/* ── Custom field definitions ────────────────────────────────────────── */

async function listFieldDefs(projectId) {
  const [rows] = await db.query(
    `SELECT id, project_id, name, type, options, position
     FROM task_custom_field_definitions
     WHERE project_id = ?
     ORDER BY position ASC, id ASC`,
    [projectId]
  );
  return rows.map((r) => ({ ...r, options: parseJsonOrNull(r.options) }));
}

async function createFieldDef({ project_id, name, type, options, position }) {
  const [result] = await db.query(
    `INSERT INTO task_custom_field_definitions (project_id, name, type, options, position)
     VALUES (?, ?, ?, ?, ?)`,
    [
      project_id,
      name,
      FIELD_TYPES.includes(type) ? type : 'text',
      options != null ? JSON.stringify(options) : null,
      position || 0,
    ]
  );
  return result.insertId;
}

async function updateFieldDef(id, data) {
  const allowed = ['name', 'type', 'options', 'position'];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
    if (key === 'options') {
      sets.push('options = ?');
      params.push(data.options != null ? JSON.stringify(data.options) : null);
    } else if (key === 'type') {
      sets.push('type = ?');
      params.push(FIELD_TYPES.includes(data.type) ? data.type : 'text');
    } else {
      sets.push(`${key} = ?`);
      params.push(data[key] == null ? null : data[key]);
    }
  }
  if (!sets.length) return 0;
  params.push(id);
  const [result] = await db.query(
    `UPDATE task_custom_field_definitions SET ${sets.join(', ')} WHERE id = ?`,
    params
  );
  return result.affectedRows;
}

async function removeFieldDef(id) {
  const [result] = await db.query('DELETE FROM task_custom_field_definitions WHERE id = ?', [id]);
  return result.affectedRows;
}

/* ── Task custom field values ────────────────────────────────────────── */

async function setTaskCustomFields(taskId, values) {
  if (!Array.isArray(values) || values.length === 0) return;
  for (const v of values) {
    if (v == null || v.field_id == null) continue;
    const value = v.value === undefined || v.value === null ? null : String(v.value);
    await db.query(
      `INSERT INTO task_custom_field_values (task_id, field_id, value)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [taskId, v.field_id, value]
    );
  }
}

async function getTaskCustomFields(taskId) {
  const [rows] = await db.query(
    `SELECT v.field_id, v.value, d.name, d.type, d.options, d.project_id
     FROM task_custom_field_values v
     INNER JOIN task_custom_field_definitions d ON d.id = v.field_id
     WHERE v.task_id = ?`,
    [taskId]
  );
  return rows.map((r) => ({
    field_id: r.field_id,
    name: r.name,
    type: r.type,
    options: parseJsonOrNull(r.options),
    value: r.value,
  }));
}

const EMPTY_ROLLUP = {
  total: 0,
  by_status: { pending: 0, in_progress: 0, review: 0, overdue: 0, completed: 0, cancelled: 0 },
  active: 0,
  at_risk: 0,
  aggregate_progress: 0,
  earliest_due: null,
};

function normalizeRollup(r) {
  const total = Number(r.total) || 0;
  const byStatus = {
    pending: Number(r.pending) || 0,
    in_progress: Number(r.in_progress) || 0,
    review: Number(r.review) || 0,
    overdue: Number(r.overdue) || 0,
    completed: Number(r.completed) || 0,
    cancelled: Number(r.cancelled) || 0,
  };
  const aggregateProgress = total > 0 ? Math.round(Number(r.aggregate_progress) || 0) : 0;
  return {
    total,
    by_status: byStatus,
    active: total - byStatus.completed - byStatus.cancelled,
    at_risk: Number(r.at_risk) || 0,
    aggregate_progress: aggregateProgress,
    earliest_due: r.earliest_due ? new Date(r.earliest_due).toISOString() : null,
  };
}

// Rollup map keyed by project_id. "at risk" = not Completed/Cancelled and due
// within the next 48 hours (overdue included). Progress = average of each task's
// latest recorded completion rate.
async function getRollupsForProjects(projectIds) {
  if (!projectIds || projectIds.length === 0) return {};
  const placeholders = projectIds.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT
        t.project_id AS project_id,
        COUNT(DISTINCT t.id) AS total,
        SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN t.status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN t.status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN t.status = 'Review' THEN 1 ELSE 0 END) AS review,
        SUM(CASE WHEN t.status = 'Pending' AND t.deadline_datetime <= NOW() THEN 1 ELSE 0 END) AS overdue,
        SUM(CASE WHEN t.status = 'Pending' AND (t.deadline_datetime IS NULL OR t.deadline_datetime > NOW()) THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN t.status NOT IN ('Completed','Cancelled') AND t.deadline_datetime IS NOT NULL AND t.deadline_datetime <= DATE_ADD(NOW(), INTERVAL 48 HOUR) THEN 1 ELSE 0 END) AS at_risk,
        AVG(COALESCE((SELECT completion_rate FROM task_progress tp WHERE tp.task_id = t.id ORDER BY tp.updated_at DESC LIMIT 1), 0)) AS aggregate_progress,
        MIN(CASE WHEN t.status NOT IN ('Completed','Cancelled') THEN t.deadline_datetime END) AS earliest_due
     FROM tasks t
     WHERE t.project_id IN (${placeholders})
     GROUP BY t.project_id`,
    projectIds
  );
  const map = {};
  for (const r of rows) map[r.project_id] = normalizeRollup(r);
  return map;
}

module.exports = {
  PROJECT_STATUSES,
  PROJECT_VIEW_TYPES,
  DEFAULT_VIEWS,
  FIELD_TYPES,
  create,
  findById,
  findByClientBusiness,
  getRollupsForProjects,
  getTree,
  update,
  remove,
  listFieldDefs,
  createFieldDef,
  updateFieldDef,
  removeFieldDef,
  setTaskCustomFields,
  getTaskCustomFields,
};

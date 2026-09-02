const db = require('../config/database');

async function createClient({ client_name, businesses, created_by, business_id, department_id }) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [clientResult] = await conn.query(
      'INSERT INTO clients (client_name, created_by, business_id, department_id) VALUES (?, ?, ?, ?)',
      [client_name, created_by ?? null, business_id ? Number(business_id) : null, department_id ? Number(department_id) : null]
    );
    const clientId = clientResult.insertId;

    if (Array.isArray(businesses) && businesses.length > 0) {
      const values = businesses
        .filter((b) => b && String(b).trim() !== '')
        .map((b) => [clientId, String(b).trim()]);
      if (values.length > 0) {
        await conn.query(
          'INSERT INTO client_businesses (client_id, business_name) VALUES ?',
          [values]
        );
      }
    }

    await conn.commit();
    return clientId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function listClients(businessId) {
  const params = [];
  let where = '';
  if (businessId !== undefined && businessId !== null && businessId !== '') {
    where = 'WHERE c.business_id = ? ';
    params.push(Number(businessId));
  }
  const [clients] = await db.query(
    `SELECT c.id, c.client_name, c.business_id, c.department_id, c.created_by,
            creator.full_name AS created_by_name,
            c.created_at, c.updated_at
     FROM clients c
     LEFT JOIN users creator ON c.created_by = creator.id
     ${where}ORDER BY c.client_name ASC`,
    params
  );

  if (clients.length === 0) return [];

  const clientIds = clients.map((c) => c.id);
  const placeholders = clientIds.map(() => '?').join(',');
  const [businesses] = await db.query(
    `SELECT id, client_id, business_name
     FROM client_businesses
     WHERE client_id IN (${placeholders})
     ORDER BY business_name ASC`,
    clientIds
  );

  const byClient = {};
  for (const b of businesses) {
    if (!byClient[b.client_id]) byClient[b.client_id] = [];
    byClient[b.client_id].push({ id: b.id, business_name: b.business_name, project_count: 0 });
  }

  const counts = await getProjectCounts(clientIds);
  for (const b of businesses) {
    if (byClient[b.client_id]) {
      const entry = byClient[b.client_id].find((x) => x.id === b.id);
      if (entry) entry.project_count = counts[b.id] || 0;
    }
  }

  return clients.map((c) => ({
    ...c,
    businesses: byClient[c.id] || [],
  }));
}

async function getProjectCounts(clientBusinessIds) {
  if (!clientBusinessIds || clientBusinessIds.length === 0) return {};
  const placeholders = clientBusinessIds.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT client_business_id, COUNT(*) AS project_count
     FROM projects WHERE client_business_id IN (${placeholders})
     GROUP BY client_business_id`,
    clientBusinessIds
  );
  const map = {};
  for (const r of rows) map[r.client_business_id] = Number(r.project_count);
  return map;
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

function aggregateRollups(rollups) {
  const acc = {
    total: 0,
    by_status: { pending: 0, in_progress: 0, review: 0, overdue: 0, completed: 0, cancelled: 0 },
    at_risk: 0,
    progressWeighted: 0,
    earliest_due: null,
  };
  for (const r of rollups) {
    acc.total += r.total;
    for (const key of Object.keys(acc.by_status)) acc.by_status[key] += r.by_status[key];
    acc.at_risk += r.at_risk;
    acc.progressWeighted += (r.aggregate_progress || 0) * (r.total || 0);
    if (r.earliest_due && (!acc.earliest_due || new Date(r.earliest_due) < new Date(acc.earliest_due))) {
      acc.earliest_due = r.earliest_due;
    }
  }
  return {
    total: acc.total,
    by_status: acc.by_status,
    active: acc.total - acc.by_status.completed - acc.by_status.cancelled,
    at_risk: acc.at_risk,
    aggregate_progress: acc.total > 0 ? Math.round(acc.progressWeighted / acc.total) : 0,
    earliest_due: acc.earliest_due,
  };
}

// Returns a rollup map keyed by client_business_id. A task counts toward its
// business via projects.client_business_id. "at risk" = not Completed/Cancelled
// and due within the next 48 hours (overdue counts). Progress is the average of
// each task's latest recorded completion rate.
async function getRollupsForBusinesses(businessIds) {
  if (!businessIds || businessIds.length === 0) return {};
  const placeholders = businessIds.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT
        p.client_business_id AS business_id,
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
     INNER JOIN projects p ON t.project_id = p.id
     WHERE p.client_business_id IN (${placeholders})
     GROUP BY p.client_business_id`,
    businessIds
  );
  const map = {};
  for (const r of rows) map[r.business_id] = normalizeRollup(r);
  return map;
}

function withBusinessRollups(clients, rollupsByBusiness) {
  return clients.map((c) => {
    const businesses = (c.businesses || []).map((b) => ({
      ...b,
      rollup: rollupsByBusiness[b.id] || EMPTY_ROLLUP,
    }));
    const clientRollup = businesses.length > 0
      ? aggregateRollups(businesses.map((b) => b.rollup))
      : EMPTY_ROLLUP;
    return { ...c, businesses, rollup: clientRollup };
  });
}

async function listClientOptions() {
  const [clients] = await db.query(
    'SELECT id, client_name, business_id, department_id FROM clients ORDER BY client_name ASC'
  );

  if (clients.length === 0) return [];

  const clientIds = clients.map((c) => c.id);
  const placeholders = clientIds.map(() => '?').join(',');
  const [businesses] = await db.query(
    `SELECT id, client_id, business_name
     FROM client_businesses
     WHERE client_id IN (${placeholders})
     ORDER BY business_name ASC`,
    clientIds
  );

  const byClient = {};
  for (const b of businesses) {
    if (!byClient[b.client_id]) byClient[b.client_id] = [];
    byClient[b.client_id].push({ id: b.id, business_name: b.business_name, project_count: 0 });
  }

  const counts = await getProjectCounts(clientIds);
  for (const b of businesses) {
    if (byClient[b.client_id]) {
      const entry = byClient[b.client_id].find((x) => x.id === b.id);
      if (entry) entry.project_count = counts[b.id] || 0;
    }
  }

  const businessIds = businesses.map((b) => b.id);
  const rollups = await getRollupsForBusinesses(businessIds);
  return withBusinessRollups(
    clients.map((c) => ({
      id: c.id,
      client_name: c.client_name,
      businesses: byClient[c.id] || [],
    })),
    rollups
  );
}

async function addBusiness(clientId, businessName) {
  const [result] = await db.query(
    'INSERT INTO client_businesses (client_id, business_name) VALUES (?, ?)',
    [clientId, String(businessName).trim()]
  );
  return result.insertId;
}

async function getClient(id) {
   const [clients] = await db.query(
     `SELECT c.id, c.client_name, c.business_id, c.color, c.created_by,
             creator.full_name AS created_by_name,
             c.created_at, c.updated_at
      FROM clients c
      LEFT JOIN users creator ON c.created_by = creator.id
      WHERE c.id = ?`,
     [id]
   );
  const client = clients[0];
  if (!client) return null;

  const [businesses] = await db.query(
    'SELECT id, client_id, business_name FROM client_businesses WHERE client_id = ? ORDER BY business_name ASC',
    [id]
  );
  const counts = await getProjectCounts(businesses.map((b) => b.id));
  client.businesses = businesses.map((b) => ({
    ...b,
    project_count: counts[b.id] || 0,
  }));
  return client;
}

async function updateClient(id, { client_name, businesses, business_id, color }) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    if (client_name !== undefined) {
      await conn.query('UPDATE clients SET client_name = ? WHERE id = ?', [client_name, id]);
    }

    if (business_id !== undefined) {
      await conn.query(
        'UPDATE clients SET business_id = ? WHERE id = ?',
        [business_id ? Number(business_id) : null, id]
      );
    }

    if (color !== undefined) {
      await conn.query('UPDATE clients SET color = ? WHERE id = ?', [color ? String(color) : null, id]);
    }

    if (businesses !== undefined && Array.isArray(businesses)) {
      await conn.query('DELETE FROM client_businesses WHERE client_id = ?', [id]);
      const values = businesses
        .filter((b) => b && String(b).trim() !== '')
        .map((b) => [id, String(b).trim()]);
      if (values.length > 0) {
        await conn.query(
          'INSERT INTO client_businesses (client_id, business_name) VALUES ?',
          [values]
        );
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Deletes a single client_businesses row and cascades to its projects (which
// cascade to tasks via ON DELETE CASCADE). Also removes tasks linked directly
// to the business (client_business_id) that have no project. Runs in one
// transaction so a failure can't leave an orphaned business with projects
// still attached.
async function removeBusiness(businessId) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [projects] = await conn.query('SELECT id FROM projects WHERE client_business_id = ?', [businessId]);
    for (const p of projects) {
      await conn.query('DELETE FROM projects WHERE id = ?', [p.id]);
    }
    // Tasks linked directly to this business (no project) must be removed
    // explicitly — their client_business_id FK is ON DELETE SET NULL.
    await conn.query('DELETE FROM tasks WHERE client_business_id = ?', [businessId]);
    const [result] = await conn.query('DELETE FROM client_businesses WHERE id = ?', [businessId]);
    await conn.commit();
    return result.affectedRows;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Deletes a client and cascades to its businesses and projects (which cascade
// to tasks). Wrapped in a transaction for atomicity. Also removes any tasks
// linked directly to the client or its businesses via client_id /
// client_business_id (these have ON DELETE SET NULL, so they must be cleared
// explicitly to avoid orphaned tasks).
async function remove(id) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [businesses] = await conn.query('SELECT id FROM client_businesses WHERE client_id = ?', [id]);
    for (const b of businesses) {
      const [projects] = await conn.query('SELECT id FROM projects WHERE client_business_id = ?', [b.id]);
      for (const p of projects) {
        await conn.query('DELETE FROM projects WHERE id = ?', [p.id]);
      }
      // Tasks linked directly to this business (no project) must be removed
      // explicitly — their client_business_id FK is ON DELETE SET NULL.
      await conn.query('DELETE FROM tasks WHERE client_business_id = ?', [b.id]);
      await conn.query('DELETE FROM client_businesses WHERE id = ?', [b.id]);
    }
    // Tasks linked directly to the client (no business/project) must also be
    // removed explicitly.
    await conn.query('DELETE FROM tasks WHERE client_id = ?', [id]);
    const [result] = await conn.query('DELETE FROM clients WHERE id = ?', [id]);
    await conn.commit();
    return result.affectedRows;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  createClient,
  addBusiness,
  listClients,
  listClientOptions,
  getClient,
  updateClient,
  removeBusiness,
  remove,
};

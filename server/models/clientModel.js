const db = require('../config/database');

async function createClient({ client_name, businesses, created_by }) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [clientResult] = await conn.query(
      'INSERT INTO clients (client_name, created_by) VALUES (?, ?)',
      [client_name, created_by ?? null]
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

async function listClients() {
  const [clients] = await db.query(
    `SELECT c.id, c.client_name, c.created_by,
            creator.full_name AS created_by_name,
            c.created_at, c.updated_at
     FROM clients c
     LEFT JOIN users creator ON c.created_by = creator.id
     ORDER BY c.client_name ASC`
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
    byClient[b.client_id].push({ id: b.id, business_name: b.business_name });
  }

  return clients.map((c) => ({
    ...c,
    businesses: byClient[c.id] || [],
  }));
}

async function listClientOptions() {
  const [clients] = await db.query(
    'SELECT id, client_name FROM clients ORDER BY client_name ASC'
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
    byClient[b.client_id].push({ id: b.id, business_name: b.business_name });
  }

  return clients.map((c) => ({
    id: c.id,
    client_name: c.client_name,
    businesses: byClient[c.id] || [],
  }));
}

async function getClient(id) {
  const [clients] = await db.query(
    `SELECT c.id, c.client_name, c.created_by,
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
  client.businesses = businesses;
  return client;
}

async function updateClient(id, { client_name, businesses }) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    if (client_name !== undefined) {
      await conn.query('UPDATE clients SET client_name = ? WHERE id = ?', [client_name, id]);
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

async function remove(id) {
  const [result] = await db.query('DELETE FROM clients WHERE id = ?', [id]);
  return result.affectedRows;
}

module.exports = {
  createClient,
  listClients,
  listClientOptions,
  getClient,
  updateClient,
  remove,
};

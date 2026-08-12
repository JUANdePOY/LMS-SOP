const WebSocket = require('ws');

const clients = new Map();

function addClient(userId, client) {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId).add(client);
}

function removeClient(userId, ws) {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) {
    clients.delete(userId);
  }
}

function getClientsForUser(userId) {
  return clients.get(userId) || new Set();
}

function broadcastToUser(userId, payload) {
  const set = getClientsForUser(userId);
  if (set.size === 0) return 0;

  const data = JSON.stringify(payload);
  let sent = 0;

  for (const client of set) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
      sent++;
    }
  }

  return sent;
}

function getConnectedUserCount() {
  let count = 0;
  for (const set of clients.values()) {
    count += set.size;
  }
  return count;
}

module.exports = {
  addClient,
  removeClient,
  getClientsForUser,
  broadcastToUser,
  getConnectedUserCount,
};

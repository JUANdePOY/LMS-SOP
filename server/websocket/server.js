const WebSocket = require('ws');
const { authenticateWebSocket } = require('./auth');
const { addClient, removeClient } = require('./clients');

const wss = new WebSocket.Server({ noServer: true });

function handleConnection(ws, req, userId) {
  const client = {
    ws,
    userId,
    connectedAt: Date.now(),
    lastPing: Date.now(),
  };

  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch {
      // ignore malformed messages
    }
  });

  ws.on('close', () => {
    removeClient(userId, ws);
  });

  ws.on('error', () => {
    removeClient(userId, ws);
  });

  addClient(userId, client);
}

function upgradeHandler(req, socket, head) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');

  if (!token) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  authenticateWebSocket(token)
    .then((userId) => {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req, userId);
      });
    })
    .catch(() => {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    });
}

module.exports = { wss, upgradeHandler, handleConnection };

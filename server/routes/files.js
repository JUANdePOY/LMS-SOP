// routes/files.js
//
// Generic authenticated file streamer. Any uploaded file whose stored URL is a
// local /uploads/... (or absolute S3) path can be served here, bypassing
// express.static (which is unreliable behind some hosts/proxies that return
// 4xx on /uploads requests). The client requests /api/files/stream?path=<enc>&token=<jwt>.
//
// Auth: a valid JWT via Authorization header OR ?token= (img tags can't send
// headers). Any authenticated user may fetch uploaded files — acceptable for
// this internal LMS. For stricter access control, scope by entity ownership
// in the route handler.

const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const storage = require('../config/storage');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

const router = express.Router();

async function authenticateFile(req, res, next) {
  const headerToken = req.headers['authorization']?.split(' ')[1];
  const token = headerToken || req.query.token;
  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Access token required', code: 'NO_TOKEN' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [users] = await db.query('SELECT id, is_active FROM users WHERE id = ?', [decoded.userId]);
    if (!users.length || !users[0].is_active) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized', code: 'USER_NOT_FOUND' });
    }
    req.user = { id: users[0].id };
    next();
  } catch {
    return res.status(401).json({ status: 'error', message: 'Invalid token', code: 'INVALID_TOKEN' });
  }
}

router.get('/stream', authenticateFile, async (req, res) => {
  try {
    const storedUrl = req.query.path;
    if (!storedUrl || typeof storedUrl !== 'string') {
      return res.status(400).json({ status: 'error', message: 'Missing path', code: 'BAD_REQUEST' });
    }
    // Only allow stored upload URLs (local /uploads/... or absolute http(s)).
    if (!storedUrl.startsWith('/uploads/') && !/^https?:\/\//i.test(storedUrl)) {
      return res.status(400).json({ status: 'error', message: 'Invalid path', code: 'BAD_PATH' });
    }
    const result = await storage.streamFile(storedUrl);
    if (!result) {
      return res.status(404).json({ status: 'error', message: 'File not found', code: 'NOT_FOUND' });
    }
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    return res.send(result.buffer);
  } catch (error) {
    console.error('File stream error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to stream file', code: 'SERVER_ERROR' });
  }
});

module.exports = router;

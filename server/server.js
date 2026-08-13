const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./config/database');
const { upgradeHandler, handleConnection } = require('./websocket/server');
const { wss } = require('./websocket/server');
const { getConnectedUserCount } = require('./websocket/clients');


require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('LMS-SOP Server starting...');

const app = express();

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000'
];

const envOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : [];

const allowedOrigins = [...defaultOrigins, ...envOrigins];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('.hostingersite.com')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Relax Cross-Origin-Opener-Policy / Cross-Origin-Embedder-Policy on document
// (HTML) responses. Some hosting edges (e.g. Hostinger) inject
// `Cross-Origin-Opener-Policy: same-origin` on HTML, which cross-origin-isolates
// the SPA tab and severs its relationship with the Google OAuth popup — blocking
// the popup's window.postMessage/window.close and leaving the calendar connect
// flow unable to signal completion. Setting `unsafe-none` on the SPA document
// (and matching it on /api/calendar/callback) lets the popup reach its opener.
// Only applied to text/html so JSON API responses keep their normal behavior.
app.use((req, res, next) => {
  const type = res.getHeader('Content-Type');
  if (!type || type.includes('text/html')) {
    res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  }
  next();
});

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const departmentsRoutes = require('./routes/departments');
const dashboardRoutes = require('./routes/dashboard');
const adminDashboardRoutes = require('./routes/adminDashboard');
const auditLogsRoutes = require('./routes/audit-logs');
const settingsRoutes = require('./routes/settings');
const rolesRoutes = require('./routes/roles');
const categoriesRoutes = require('./routes/categories');
const businessesRoutes = require('./routes/businesses');
const hierarchyRoutes = require('./routes/hierarchy');
const sopsRoutes = require('./routes/sops');
const sopSharePublicRouter = require('./routes/sopSharePublic');
const coursesRoutes = require('./routes/courses');
const enrollmentsRoutes = require('./routes/enrollments');
const learningPathsRoutes = require('./routes/learningPaths');
const { courseRoutes: progressCourseRoutes, lessonRoutes: progressLessonRoutes } = require('./routes/progress');
const gradesRoutes = require('./routes/grades');
const discussionsRoutes = require('./routes/discussions');
const courseBuilderRoutes = require('./routes/course-builder');
const quizzesRoutes = require('./routes/quizzes');
const quizAttemptsRoutes = require('./routes/attempts');
const announcementsRoutes = require('./routes/announcements');
const eventsRoutes = require('./routes/events');
const calendarRoutes = require('./routes/calendar');
const messagesRoutes = require('./routes/messages');
const tasksRoutes = require('./routes/tasks');
const taskAttachmentPublicFile = require('./services/taskAttachmentPublicFile');
const employeeRoutes = require('./routes/employee');
const notificationsRoutes = require('./routes/notifications');

const { templateRouter, templateFramePublicRouter, signatureRouter, signatureImageRouter, issuanceRouter } = require('./routes/certificates');
const { certificateCourseLinkRouter } = require('./routes/certificate-course-links');
const sopAttachmentPublicFile = require('./services/sopAttachmentPublicFile');

const { getUploadRoot } = require('./config/uploads');
const storage = require('./config/storage');
const filesRouter = require('./routes/files');

const loginDebug = process.env.LOGIN_DEBUG === 'true';
if (loginDebug) {
  app.use('/api/auth', (req, res, next) => {
    console.log('[auth-debug]', req.method, req.path, {
      origin: req.get('origin'),
      contentType: req.get('content-type'),
      authorization: req.get('authorization') ? 'Bearer ***' : null,
      bodySample: req.body && typeof req.body === 'object' ? { ...req.body, password: req.body?.password ? '***' : req.body?.password } : req.body,
    });
    next();
  });
}

const clientDist = process.env.CLIENT_DIST_PATH
  ? path.resolve(process.env.CLIENT_DIST_PATH)
  : path.join(__dirname, '..', 'client', 'dist');
console.log('Client dist path:', clientDist);
console.log('Client dist exists:', fs.existsSync(clientDist));
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { index: false }));
  console.log('Static file serving enabled from:', clientDist);
} else {
  console.warn('WARNING: client/dist not found! Build may have failed.');
}

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/businesses', businessesRoutes);
app.use('/api/hierarchy', hierarchyRoutes);

app.use('/api/sops/attachments', sopAttachmentPublicFile);
app.use('/api/sops/share', sopSharePublicRouter);
app.use('/api/sops', sopsRoutes);

app.use('/api/courses', coursesRoutes);
app.use('/api/courses', progressCourseRoutes);
app.use('/api/enrollments', enrollmentsRoutes);
app.use('/api/learning-paths', learningPathsRoutes);
app.use('/api/lessons', progressLessonRoutes);
app.use('/api/course-builder', courseBuilderRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/quiz', quizzesRoutes);
app.use('/api/quiz-attempts', quizAttemptsRoutes);
app.use('/api/grades', gradesRoutes);
app.use('/api/discussions', discussionsRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/tasks/attachments', taskAttachmentPublicFile.router);
app.use('/api/tasks', tasksRoutes);
app.use('/api/notifications', notificationsRoutes);

const searchRoutes = require('./routes/search');
app.use('/api/search', searchRoutes);

app.use('/uploads', express.static(getUploadRoot()));

// Authenticated file streaming (avoids express.static, which is unreliable
// behind some hosts/proxies). Inline images/mini-files use this route.
app.use('/api/files', filesRouter);

// Proxy for objects stored in a private S3-compatible bucket. When STORAGE_DRIVER=s3
// and the bucket is not public, store URLs as `/uploads/s3/<key>` (see config/storage.js
// s3KeyFor) and this route streams the object back with a fresh signed request. Public
// buckets can store absolute object URLs instead and skip this proxy entirely.
if (storage.isS3()) {
  app.get('/uploads/s3/:key(*)', async (req, res) => {
    try {
      const key = req.params.key;
      if (!key || key.includes('..')) {
        return res.status(400).json({ status: 'error', message: 'Invalid key', code: 'BAD_KEY' });
      }
      const buffer = await storage.readFile(`/uploads/s3/${key}`);
      if (!buffer) {
        return res.status(404).json({ status: 'error', message: 'Not found', code: 'NOT_FOUND' });
      }
      const ext = require('path').extname(key).toLowerCase();
      const MIME = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.webp': 'image/webp', '.gif': 'image/gif', '.pdf': 'application/pdf',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
      res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
      return res.send(buffer);
    } catch (err) {
      console.error('S3 proxy error:', err.message);
      return res.status(500).json({ status: 'error', message: 'Failed to load file', code: 'PROXY_ERROR' });
    }
  });
}

// Certificate management routes
// Public frame route must be mounted BEFORE the admin-protected template
// router so that unauthenticated users can fetch certificate frame images
// for issued-certificate previews.
app.use('/api/certificate-templates', templateFramePublicRouter);
app.use('/api/certificate-templates', templateRouter);
app.use('/api/certificate-signatures', signatureImageRouter);
app.use('/api/certificate-signatures', signatureRouter);
app.use('/api/certificate-issuances', issuanceRouter);
app.use('/api/certificate-courses', certificateCourseLinkRouter);

app.get('/api/health', async (req, res) => {
  const result = { status: 'OK', timestamp: new Date().toISOString(), env: process.env.NODE_ENV };
  try {
    const [rows] = await db.query('SELECT 1 as test');
    result.db = 'connected';
  } catch (err) {
    result.db = 'failed';
    result.dbError = err.message;
  }
  res.json(result);
});

app.get('/api/ping', (req, res) => {
  res.json({ status: 'pong', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

app.get('/api/debug', (req, res) => {
  res.json({
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    dbHost: process.env.DB_HOST,
    dbName: process.env.DB_NAME,
    clientDist,
    clientDistExists: fs.existsSync(clientDist),
    distContents: fs.existsSync(clientDist) ? fs.readdirSync(clientDist) : []
  });
});

// Admin endpoint: report where the calendar token encryption key comes from.
// Returns { source: 'env'|'db'|'generated'|'none' }
app.get('/api/admin/calendar/key-source', async (req, res) => {
  try {
    const { getKeySource } = require('./utils/calendarKey');
    const source = await getKeySource();
    res.json({ source });
  } catch (err) {
    res.status(500).json({ error: 'Failed to determine key source' });
  }
});

app.use(async (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }

  if (res.headersSent) {
    return next();
  }

  const indexPath = path.join(clientDist, 'index.html');

  try {
    const content = await fs.promises.readFile(indexPath, 'utf-8');
    res.setHeader('Content-Type', 'text/html');
    return res.send(content);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      console.error('SPA index.html missing at', indexPath);
      return res.status(404).json({ status: 'error', message: 'Not found', code: 'NOT_FOUND' });
    }
    console.error('SPA index.html read/send error:', err.message, 'code:', err.code);
    return res.status(404).json({ status: 'error', message: 'Not found', code: 'NOT_FOUND' });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    code: 'NOT_FOUND'
  });
});

const PORT = process.env.PORT || 5000;

// Validate the Google Calendar token encryption key at boot. If it is missing
// or malformed, calendar tokens cannot be decrypted on the next request and the
// user is forced to reconnect every restart/deploy. A stable key MUST be set in
// the environment (e.g. Hostinger app env vars) — not in a gitignored .env that
// isn't deployed. This check fails fast with a clear message instead of letting
// the reconnect loop fail silently.
(function validateCalendarKey() {
  const raw = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    return;
  }
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    return;
  }
})();

(function validateVapidKeys() {
  const publicKey = process.env.FCM_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.FCM_VAPID_PRIVATE_KEY || process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    // Push notifications are disabled until VAPID keys are configured.
  }
})();

// Guarantee the local upload directory exists on boot. With STORAGE_DRIVER=local
// this MUST live on a persistent volume so uploaded images survive redeploys.
storage.ensureLocalRoot().catch((err) => {
  console.error('Failed to ensure upload root directory:', err.message);
});

if (storage.isS3()) {
  try {
    storage.validateS3Config();
    console.log('S3 storage config validated');
  } catch (err) {
    console.error('S3 config error:', err.message);
    process.exit(1);
  }
}

const server = app.listen(PORT, () => {
  console.log(`LMS-SOP Server running on port ${PORT}`);
  console.log(`Database: ${process.env.DB_HOST}/${process.env.DB_NAME}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

server.on('upgrade', upgradeHandler);

wss.on('connection', (ws, req, userId) => {
  handleConnection(ws, req, userId);
});

const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

server.on('close', () => {
  clearInterval(heartbeatInterval);
});

setInterval(() => {
  const count = getConnectedUserCount();
  if (count > 0) {
    console.log(`[WS] Active WebSocket connections: ${count}`);
  }
}, 60000);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Another instance may already be running.`);
    console.error('If you see multiple "LMS-SOP Server starting..." lines, stop the duplicate process.');
    setTimeout(() => process.exit(0), 100);
  } else {
    console.error('Server error:', err);
  }
});

module.exports = app;


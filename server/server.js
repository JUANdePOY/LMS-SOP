const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./config/database');
const loginLimiter = require('./middleware/rateLimiter');

require('dotenv').config();

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

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const departmentsRoutes = require('./routes/departments');
const dashboardRoutes = require('./routes/dashboard');
const auditLogsRoutes = require('./routes/audit-logs');
const settingsRoutes = require('./routes/settings');
const rolesRoutes = require('./routes/roles');

const clientDist = path.join(__dirname, '..', 'client', 'dist');
console.log('Client dist path:', clientDist);
console.log('Client dist exists:', fs.existsSync(clientDist));
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  console.log('Static file serving enabled from:', clientDist);
} else {
  console.warn('WARNING: client/dist not found! Build may have failed.');
}

app.use('/api/auth', loginLimiter, authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/roles', rolesRoutes);

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

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(clientDist, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return res.status(404).json({ status: 'error', message: 'Not found', code: 'NOT_FOUND' });
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

app.listen(PORT, () => {
  console.log(`LMS-SOP Server running on port ${PORT}`);
  console.log(`Database: ${process.env.DB_HOST}/${process.env.DB_NAME}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

console.log('SERVER STARTING - Loading updated code...');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require('./routes/auth');
const reservistsRoutes = require('./routes/reservists');
const arsentsRoutes = require('./routes/arsents');
const groupsRoutes = require('./routes/groups');
const squadronRoutes = require('./routes/squadron');
const squadronsRoutes = require('./routes/squadrons');
const areasRoutes = require('./routes/areas');
const suppliesRoutes = require('./routes/supplies');
const issuancesRoutes = require('./routes/issuances');
const trainingsRoutes = require('./routes/trainings');
const attendanceRoutes = require('./routes/attendance');
const readinessRoutes = require('./routes/readiness');
const reportsRoutes = require('./routes/reports');
const alertsRoutes = require('./routes/alerts');
const auditLogsRoutes = require('./routes/audit-logs');
const settingsRoutes = require('./routes/settings');
const dashboardRoutes = require('./routes/dashboard');
const assignmentsRoutes = require('./routes/assignments');
const hierarchyRoutes = require('./routes/hierarchy');
const announcementsRoutes = require('./routes/announcements');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/reservists', reservistsRoutes);
app.use('/api/arsens', arsentsRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/squadron', squadronRoutes);
app.use('/api/squadrons', squadronsRoutes);
app.use('/api/areas', areasRoutes);
app.use('/api/supplies', suppliesRoutes);
app.use('/api/issuances', issuancesRoutes);
app.use('/api/trainings', trainingsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/readiness', readinessRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/hierarchy', hierarchyRoutes);
app.use('/api/announcements', announcementsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    code: 'NOT_FOUND'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`PAFR Server running on port ${PORT}`);
});

module.exports = app;
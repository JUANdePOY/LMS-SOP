const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

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
const areasRoutes = require('./routes/areas');
// const suppliesRoutes = require('./routes/supplies');
// const issuancesRoutes = require('./routes/issuances');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/reservists', reservistsRoutes);
app.use('/api/arsens', arsentsRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/squadron', squadronRoutes);
app.use('/api/areas', areasRoutes);
// app.use('/api/supplies', suppliesRoutes);
// app.use('/api/issuances', issuancesRoutes);

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

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`PAFR Server running on port ${PORT}`);
});

module.exports = app;
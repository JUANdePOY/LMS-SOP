const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const trainingsRouter = require('./routes/trainings');
const organizationRouter = require('./routes/organization');
const announcementsRoutes = require('./routes/announcements');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ ok: true });
});

// Routes
app.use('/api', organizationRouter);
app.use('/api/trainings', trainingsRouter);
app.use('/api/announcements', announcementsRoutes);

// Do not pass a listen() callback: Express also registers it on server 'error',
// so on EADDRINUSE the callback still runs and prints "running" while the process exits.
const server = app.listen(PORT);

server.on('listening', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the other process or set PORT to a free port.`);
  } else {
    console.error('Server failed to start:', err.message);
  }
  process.exit(1);
});

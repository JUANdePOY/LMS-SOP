const express = require('express');
const cors = require('cors');
const trainingsRouter = require('./routes/trainings');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/trainings', trainingsRouter);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Airforce System Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
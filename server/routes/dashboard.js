const express = require('express');
const router = express.Router();

// TODO: Implement dashboard API
router.get('/', (req, res) => res.json({ message: 'Dashboard API - TODO' }));

module.exports = router;
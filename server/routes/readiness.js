const express = require('express');
const router = express.Router();

// TODO: Implement readiness API
router.get('/', (req, res) => res.json({ message: 'Readiness API - TODO' }));

module.exports = router;
const express = require('express');
const router = express.Router();

// TODO: Implement settings API
router.get('/', (req, res) => res.json({ message: 'Settings API - TODO' }));

module.exports = router;
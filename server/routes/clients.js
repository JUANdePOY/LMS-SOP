const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { clientController } = require('../controllers/clientController');

const router = express.Router();

// Admin + department head can manage clients.
router.get('/', authenticateToken, requireAdmin, clientController.listClients);
router.get('/options', authenticateToken, requireAdmin, clientController.listClientOptions);
router.get('/:id', authenticateToken, requireAdmin, clientController.getClient);
router.post('/', authenticateToken, requireAdmin, clientController.createClient);
router.put('/:id', authenticateToken, requireAdmin, clientController.updateClient);
router.delete('/:id', authenticateToken, requireAdmin, clientController.deleteClient);

module.exports = router;

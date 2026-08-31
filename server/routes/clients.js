const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { clientController } = require('../controllers/clientController');

const router = express.Router();

// Authenticated users may list clients; employees are scoped to their own SOP
// business by the controller. Mutation routes remain admin-only.
router.get('/', authenticateToken, clientController.listClients);
router.get('/options', authenticateToken, requireAdmin, clientController.listClientOptions);
router.get('/:id', authenticateToken, requireAdmin, clientController.getClient);
router.post('/', authenticateToken, requireAdmin, clientController.createClient);
router.put('/:id', authenticateToken, requireAdmin, clientController.updateClient);
router.delete('/:id', authenticateToken, requireAdmin, clientController.deleteClient);
// Append a single business to an existing client (does not remove others).
router.post('/:id/businesses', authenticateToken, requireAdmin, clientController.addBusiness);
// Delete a single business (client_businesses row) and cascade to its projects.
router.delete('/:id/businesses/:businessId', authenticateToken, requireAdmin, clientController.deleteBusiness);

module.exports = router;

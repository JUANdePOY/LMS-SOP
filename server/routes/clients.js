const express = require('express');
const { authenticateToken, resolveScope } = require('../middleware/auth');
const { requirePermission, requirePermissionAction, requireEntityTypeAccess } = require('../middleware/scope');
const { clientController } = require('../controllers/clientController');

const router = express.Router();

router.get('/', authenticateToken, resolveScope, clientController.listClients);
router.get('/options', authenticateToken, resolveScope, requirePermission('manage_clients'), clientController.listClientOptions);
router.get('/:id', authenticateToken, resolveScope, requirePermission('manage_clients'), clientController.getClient);
router.post('/', [
  authenticateToken,
  resolveScope,
  requireEntityTypeAccess('client'),
  requirePermission('manage_clients'),
  requirePermissionAction('manage_clients', 'create'),
], clientController.createClient);
router.put('/:id', [
  authenticateToken,
  resolveScope,
  requireEntityTypeAccess('client'),
  requirePermission('manage_clients'),
  requirePermissionAction('manage_clients', 'edit'),
], clientController.updateClient);
router.delete('/:id', [
  authenticateToken,
  resolveScope,
  requireEntityTypeAccess('client'),
  requirePermission('manage_clients'),
  requirePermissionAction('manage_clients', 'delete'),
], clientController.deleteClient);
router.post('/:id/businesses', [
  authenticateToken,
  resolveScope,
  requireEntityTypeAccess('client'),
  requirePermission('manage_clients'),
  requirePermissionAction('manage_clients', 'edit'),
], clientController.addBusiness);
router.delete('/:id/businesses/:businessId', [
  authenticateToken,
  resolveScope,
  requireEntityTypeAccess('client'),
  requirePermission('manage_clients'),
  requirePermissionAction('manage_clients', 'edit'),
], clientController.deleteBusiness);

module.exports = router;
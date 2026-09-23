const express = require('express');
const multer = require('multer');
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
  requirePermissionAction('manage_clients', 'create'),
], clientController.addBusiness);
router.get('/:id/businesses/:businessId', [
  authenticateToken,
  resolveScope,
  requireEntityTypeAccess('client'),
  requirePermission('manage_clients'),
], clientController.getClientBusiness);
router.put('/:id/businesses/:businessId', [
  authenticateToken,
  resolveScope,
  requireEntityTypeAccess('client'),
  requirePermission('manage_clients'),
  requirePermissionAction('manage_clients', 'edit'),
], clientController.updateBusiness);
router.post('/:id/businesses/:businessId/duplicate', [
  authenticateToken,
  resolveScope,
  requireEntityTypeAccess('client'),
  requirePermission('manage_clients'),
  requirePermissionAction('manage_clients', 'create'),
], clientController.duplicateBusiness);
router.delete('/:id/businesses/:businessId', [
  authenticateToken,
  resolveScope,
  requireEntityTypeAccess('client'),
  requirePermission('manage_clients'),
  requirePermissionAction('manage_clients', 'delete'),
], clientController.deleteBusiness);

function clientBulkUploadMiddleware(req, res, next) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter(req, file, cb) {
      const ext = String(file.originalname || '').toLowerCase();
      const mime = String(file.mimetype || '').toLowerCase();
      const allowedMimes = new Set([
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/json',
      ]);
      const allowedExts = new Set(['.csv', '.xlsx', '.xls', '.json']);
      if (!allowedMimes.has(mime) && !allowedExts.has(ext)) {
        return cb(new Error('Invalid file type. Allowed: CSV, XLSX, JSON.'), false);
      }
      cb(null, true);
    },
  }).single('file');

  upload(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 25 MB)' : err.message || 'Upload failed';
      return res.status(400).json({ success: false, message: msg, code: 'VALIDATION_ERROR' });
    }
    next();
  });
}

router.post('/bulk-upload', [
  authenticateToken,
  resolveScope,
  requireEntityTypeAccess('client'),
  requirePermission('manage_clients'),
  requirePermissionAction('manage_clients', 'create'),
  clientBulkUploadMiddleware,
], clientController.bulkUploadClients);

module.exports = router;
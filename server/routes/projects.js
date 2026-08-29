const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { projectController } = require('../controllers/projectController');

const router = express.Router();

// Admin only: the Client → Business → Project tree lives in the org workspace.
router.get('/tree', authenticateToken, requireAdmin, projectController.getTree);
router.get('/', authenticateToken, requireAdmin, projectController.listProjects);
router.post('/', authenticateToken, requireAdmin, projectController.createProject);
router.get('/:id', authenticateToken, requireAdmin, projectController.getProject);
router.put('/:id', authenticateToken, requireAdmin, projectController.updateProject);
router.delete('/:id', authenticateToken, requireAdmin, projectController.deleteProject);

// Per-project custom field definitions (ClickUp/Notion style).
router.get('/:id/fields', authenticateToken, requireAdmin, projectController.listFields);
router.post('/:id/fields', authenticateToken, requireAdmin, projectController.createField);
router.put('/:id/fields/:fieldId', authenticateToken, requireAdmin, projectController.updateField);
router.delete('/:id/fields/:fieldId', authenticateToken, requireAdmin, projectController.deleteField);

module.exports = router;

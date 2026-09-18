const router = require('express').Router();
const eventController = require('../controllers/eventController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission, requirePermissionAction } = require('../middleware/scope');

router.use(authenticateToken);

router.get('/', eventController.listEvents);
router.get('/:id', eventController.getEvent);
router.post('/', requirePermission('manage_events'), requirePermissionAction('manage_events', 'create'), eventController.createEvent);
router.put('/:id', requirePermission('manage_events'), requirePermissionAction('manage_events', 'edit'), eventController.updateEvent);
router.delete('/:id', requirePermission('manage_events'), requirePermissionAction('manage_events', 'delete'), eventController.deleteEvent);

module.exports = router;

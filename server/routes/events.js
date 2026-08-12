const router = require('express').Router();
const eventController = require('../controllers/eventController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/scope');

router.use(authenticateToken);

router.get('/', eventController.listEvents);
router.get('/:id', eventController.getEvent);
router.post('/', requirePermission('manage_events'), eventController.createEvent);
router.put('/:id', requirePermission('manage_events'), eventController.updateEvent);
router.delete('/:id', requirePermission('manage_events'), eventController.deleteEvent);

module.exports = router;

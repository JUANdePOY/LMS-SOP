const router = require('express').Router();
const eventController = require('../controllers/eventController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', eventController.listEvents);
router.get('/:id', eventController.getEvent);
router.post('/', eventController.createEvent);
router.put('/:id', eventController.updateEvent);
router.delete('/:id', eventController.deleteEvent);

module.exports = router;

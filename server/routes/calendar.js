const router = require('express').Router();
const ctrl = require('../controllers/calendarController');

router.use(ctrl.authenticateToken);

router.get('/auth-url', ctrl.getAuthUrl);
router.get('/callback', ctrl.handleCallback);
router.get('/status', ctrl.getStatus);
router.post('/disconnect', ctrl.disconnect);
router.post('/sync/:eventId', ctrl.syncEvent);
router.delete('/sync/:eventId', ctrl.unsyncEvent);

module.exports = router;

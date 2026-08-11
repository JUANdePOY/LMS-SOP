const router = require('express').Router();
const ctrl = require('../controllers/calendarController');

// The OAuth popup callback has no app session (it runs in a separate
// browsing context), so it authenticates via the signed `state` param
// instead of a JWT. Only the user-initiated routes need authenticateToken.
router.get('/callback', ctrl.handleCallback);

router.use(ctrl.authenticateToken);

router.get('/auth-url', ctrl.getAuthUrl);
router.get('/status', ctrl.getStatus);
router.post('/disconnect', ctrl.disconnect);
router.post('/sync/:eventId', ctrl.syncEvent);
router.delete('/sync/:eventId', ctrl.unsyncEvent);

module.exports = router;

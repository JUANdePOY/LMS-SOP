const router = require('express').Router();
const announcementController = require('../controllers/announcementController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/scope');

router.use(authenticateToken);

router.get('/', announcementController.listAnnouncements);
router.get('/:id', announcementController.getAnnouncement);
router.post('/', requirePermission('manage_announcements'), announcementController.createAnnouncement);
router.put('/:id', requirePermission('manage_announcements'), announcementController.updateAnnouncement);
router.delete('/:id', requirePermission('manage_announcements'), announcementController.deleteAnnouncement);

module.exports = router;

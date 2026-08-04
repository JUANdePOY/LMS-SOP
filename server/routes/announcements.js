const router = require('express').Router();
const announcementController = require('../controllers/announcementController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', announcementController.listAnnouncements);
router.get('/:id', announcementController.getAnnouncement);
router.post('/', announcementController.createAnnouncement);
router.put('/:id', announcementController.updateAnnouncement);
router.delete('/:id', announcementController.deleteAnnouncement);

module.exports = router;

const router = require('express').Router();
const announcementController = require('../controllers/announcementController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/scope');
const { announcementImageUpload } = require('../middleware/announcementUpload');
const storage = require('../config/storage');

router.use(authenticateToken);

// Upload an image to be embedded in an announcement body. The bytes are always
// persisted into the `file_blobs` table (independent of STORAGE_DRIVER) so the
// asset survives redeploys where the host filesystem is ephemeral. The route
// returns the canonical /uploads/... path; the client rewrites it to the
// authenticated /api/files/stream URL (see client resolveFileUrl) at render
// time, so the image renders for every viewer without a stale/expiring token
// being baked into the stored HTML.
router.post('/upload-image', requirePermission('manage_announcements'), announcementImageUpload, async (req, res) => {
  try {
    const url = await storage.dbSave(
      req.file.buffer,
      `announcements/${req.file.filename}`,
      req.file.mimetype
    );
    res.json({ success: true, url });
  } catch (err) {
    console.error('Announcement image upload error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
});

router.get('/', announcementController.listAnnouncements);
router.get('/:id', announcementController.getAnnouncement);
router.post('/', requirePermission('manage_announcements'), announcementController.createAnnouncement);
router.put('/:id', requirePermission('manage_announcements'), announcementController.updateAnnouncement);
router.delete('/:id', requirePermission('manage_announcements'), announcementController.deleteAnnouncement);

module.exports = router;

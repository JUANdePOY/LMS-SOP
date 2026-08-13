const router = require('express').Router();
const announcementController = require('../controllers/announcementController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/scope');
const { announcementImageUpload } = require('../middleware/announcementUpload');
const storage = require('../config/storage');

router.use(authenticateToken);

// Upload an image to be embedded in an announcement body. Returns a servable
// URL (a relative /uploads/... path for local storage, or an absolute object
// URL for S3) that the rich-text editor inserts into the HTML body. In DB-blob
// storage the client rewrites this to the authenticated /api/files/stream URL
// (see client resolveFileUrl) so the image actually renders.
router.post('/upload-image', requirePermission('manage_announcements'), announcementImageUpload, async (req, res) => {
  try {
    const url = await storage.saveFile({
      buffer: req.file.buffer,
      dir: 'announcements',
      filename: req.file.filename,
      contentType: req.file.mimetype,
    });
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

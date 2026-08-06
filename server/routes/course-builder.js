const express = require('express');
const router = express.Router();
const courseBuildController = require('../controllers/courseBuildController');
const { authenticateToken } = require('../middleware/auth');
const { upload } = require('../middleware/courseThumbnailUpload');

router.use(authenticateToken);

router.get('/', courseBuildController.listCourses);
router.get('/:id', courseBuildController.getCourse);

router.use((req, res, next) => {
  if (!['super_admin', 'admin', 'department_head'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden', code: 'FORBIDDEN' });
  }
  next();
});

router.post('/thumbnail', upload.single('thumbnail'), courseBuildController.uploadThumbnail);
router.post('/', courseBuildController.createCourse);
router.put('/:id', courseBuildController.updateCourse);
router.delete('/:id', courseBuildController.deleteCourse);

module.exports = router;

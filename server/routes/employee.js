const express = require('express');
const router = express.Router();
const employeeSopController = require('../controllers/employeeSopController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/sops/:id', employeeSopController.getSop);
router.get('/courses/:courseId/sops', employeeSopController.listCourseSops);

module.exports = router;

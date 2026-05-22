const express = require('express');
const router = express.Router();
const announcementsController = require('../controllers/announcementsController');

router.get('/', announcementsController.getAll);
router.get('/:id', announcementsController.getById);
router.post('/', announcementsController.create);
router.put('/:id', announcementsController.update);
router.delete('/:id', announcementsController.delete);

module.exports = router;
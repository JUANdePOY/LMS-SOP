const express = require('express');
const router = express.Router();
const discussionsController = require('../controllers/discussionsController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/course/:courseId', discussionsController.createDiscussion);
router.get('/course/:courseId', discussionsController.listDiscussions);
router.post('/:discussionId/replies', discussionsController.createReply);
router.patch('/:discussionId/pin', discussionsController.pinDiscussion);
router.patch('/:discussionId/close', discussionsController.closeDiscussion);
router.put('/:discussionId', discussionsController.updateDiscussion);
router.delete('/:discussionId', discussionsController.deleteDiscussion);
router.get('/:discussionId', discussionsController.getDiscussion);

module.exports = router;

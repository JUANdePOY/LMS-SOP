const express = require('express');
const router = express.Router();
const discussionsController = require('../controllers/discussionsController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/scope');

router.use(authenticateToken);

router.post('/course/:courseId', requirePermission('manage_courses'), discussionsController.createDiscussion);
router.get('/course/:courseId', discussionsController.listDiscussions);
router.post('/:discussionId/replies', requirePermission('manage_courses'), discussionsController.createReply);
router.patch('/:discussionId/pin', requirePermission('manage_courses'), discussionsController.pinDiscussion);
router.patch('/:discussionId/close', requirePermission('manage_courses'), discussionsController.closeDiscussion);
router.put('/:discussionId', requirePermission('manage_courses'), discussionsController.updateDiscussion);
router.delete('/:discussionId', requirePermission('manage_courses'), discussionsController.deleteDiscussion);
router.get('/:discussionId', discussionsController.getDiscussion);

module.exports = router;

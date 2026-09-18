const express = require('express');
const router = express.Router();
const discussionsController = require('../controllers/discussionsController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission, requirePermissionAction } = require('../middleware/scope');

router.use(authenticateToken);

router.post('/course/:courseId', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'create'), discussionsController.createDiscussion);
router.get('/course/:courseId', discussionsController.listDiscussions);
router.post('/:discussionId/replies', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'create'), discussionsController.createReply);
router.patch('/:discussionId/pin', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'edit'), discussionsController.pinDiscussion);
router.patch('/:discussionId/close', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'edit'), discussionsController.closeDiscussion);
router.put('/:discussionId', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'edit'), discussionsController.updateDiscussion);
router.delete('/:discussionId', requirePermission('manage_courses'), requirePermissionAction('manage_courses', 'delete'), discussionsController.deleteDiscussion);
router.get('/:discussionId', discussionsController.getDiscussion);

module.exports = router;

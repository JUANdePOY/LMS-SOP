const router = require('express').Router();
const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/conversations', messageController.listConversations);
router.get('/conversations/:id', messageController.getConversation);
router.post('/conversations', messageController.createConversation);
router.post('/conversations/:conversationId/messages', messageController.sendMessage);
router.get('/conversations/:conversationId/messages', messageController.listMessages);
router.patch('/messages/:messageId/read', messageController.markAsRead);
router.delete('/conversations/:id', messageController.deleteConversation);

module.exports = router;

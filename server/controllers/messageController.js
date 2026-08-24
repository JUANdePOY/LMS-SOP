const messageModel = require('../models/messageModel');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');
const { createNotification } = require('../services/notificationService');

function sendError(res, err, fallback = 'Request failed') {
  const code = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const message = err.statusCode ? err.message : fallback;
  const body = { success: false, message };
  if (process.env.NODE_ENV !== 'production' && code === 500 && err && typeof err === 'object') {
    if (err.message && err.message !== message) body.details = err.message;
    if (err.sqlMessage) body.sqlMessage = err.sqlMessage;
    if (err.code) body.code = err.code;
  }
  if (code === 500) console.error('[Messaging Controller Error]', err);
  try {
    return res.status(code).json(body);
  } catch {
    // Fallback: never let a serialization failure crash the process or throw
    // "headers already sent" when the response was already flushed.
    if (!res.headersSent) res.status(code).end(message);
    return undefined;
  }
}

function listConversations(req, res) {
  const userId = req.user?.id;
  messageModel.listConversations(userId)
    .then((conversations) => {
      res.json({ success: true, message: 'OK', data: conversations });
    })
    .catch((err) => sendError(res, err, 'Failed to list conversations'));
}

function getConversation(req, res) {
  const { id } = req.params;
  const userId = req.user?.id;
  messageModel.getConversation(id)
    .then((conversation) => {
      if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found', code: 'NOT_FOUND' });
      return messageModel.listMessages(id).then((messages) => {
        res.json({ success: true, message: 'OK', data: { ...conversation, messages } });
      });
    })
    .catch((err) => sendError(res, err, 'Failed to load conversation'));
}

async function createConversation(req, res) {
  const userId = req.user?.id;
  const role = req.user?.role;
  const { subject, body, participantIds } = req.body;

  if (!body || !body.trim()) {
    return res.status(400).json({ success: false, message: 'Message body is required', code: 'VALIDATION_ERROR' });
  }

  const participants = Array.isArray(participantIds) ? participantIds : [];
  const isGroupForum = participants.length > 1;
  if (isGroupForum) {
    const allowed = ['super_admin', 'admin'];
    if (!allowed.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Only Super Admins and Admins can create a group forum',
        code: 'FORBIDDEN',
      });
    }
  }

  if (!isGroupForum && participants.length === 1) {
    const existing = await messageModel.findDirectConversation(userId, participants[0]);
    if (existing) {
      const message = await messageModel.addMessage({
        conversationId: existing.id,
        senderId: userId,
        body: body.trim(),
      });
      logAudit && logAudit('message.conversation.reuse', userId, { conversationId: existing.id });

      const recipientIds = (await messageModel.getParticipants(existing.id))
        .filter((p) => p.id !== userId)
        .map((p) => p.id);
      const sender = await messageModel.getParticipants(existing.id).then((ps) => ps.find((p) => p.id === userId));
      const senderName = req.user?.full_name || sender?.full_name || 'Someone';
      for (const recipientId of recipientIds) {
        createNotification({
          userId: recipientId,
          title: 'New Message',
          body: `${senderName}: ${body.trim().slice(0, 120)}`,
          type: 'info',
          link: `/messaging`,
          entityType: 'message',
          entityId: existing.id,
        }).catch(() => {});
      }

      return res.status(201).json({
        success: true,
        message: 'Conversation created',
        data: { ...existing, messages: [message] },
      });
    }
  }

  messageModel.createConversation({
    subject: subject || null,
    createdBy: userId,
    participantIds: participantIds || [],
  })
    .then(async (conversation) => {
      const message = await messageModel.addMessage({
        conversationId: conversation.id,
        senderId: userId,
        body: body.trim(),
      });
      logAudit && logAudit('message.conversation.create', userId, { conversationId: conversation.id });

      const recipientIds = conversation.participants
        .filter((p) => p.id !== userId)
        .map((p) => p.id);
      const sender = conversation.participants.find((p) => p.id === userId);
      const senderName = req.user?.full_name || sender?.full_name || 'Someone';
      for (const recipientId of recipientIds) {
        createNotification({
          userId: recipientId,
          title: 'New Conversation',
          body: `${senderName}: ${body.trim().slice(0, 120)}`,
          type: 'info',
          link: `/messaging`,
          entityType: 'message',
          entityId: conversation.id,
        }).catch(() => {});
      }

      res.status(201).json({ success: true, message: 'Conversation created', data: { ...conversation, messages: [message] } });
    })
    .catch((err) => sendError(res, err, 'Failed to create conversation'));
}

function sendMessage(req, res) {
  const { conversationId } = req.params;
  const userId = req.user?.id;
  const { body } = req.body;

  if (!body || !body.trim()) {
    return res.status(400).json({ success: false, message: 'Message body is required', code: 'VALIDATION_ERROR' });
  }

  messageModel.getConversation(conversationId)
    .then(async (conversation) => {
      if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found', code: 'NOT_FOUND' });
      const message = await messageModel.addMessage({ conversationId, senderId: userId, body: body.trim() });
      logAudit && logAudit('message.send', userId, { conversationId, messageId: message.id });

      const recipientIds = conversation.participants
        .filter((p) => p.id !== userId)
        .map((p) => p.id);
      const sender = conversation.participants.find((p) => p.id === userId);
      const senderName = req.user?.full_name || sender?.full_name || 'Someone';
      for (const recipientId of recipientIds) {
        createNotification({
          userId: recipientId,
          title: 'New Message',
          body: `${senderName}: ${body.trim().slice(0, 120)}`,
          type: 'info',
          link: `/messaging`,
          entityType: 'message',
          entityId: conversation.id,
        }).catch(() => {});
      }

      res.status(201).json({ success: true, message: 'Message sent', data: message });
    })
    .catch((err) => sendError(res, err, 'Failed to send message'));
}

function listMessages(req, res) {
  const { conversationId } = req.params;
  const userId = req.user?.id;
  messageModel.getConversation(conversationId)
    .then((conversation) => {
      if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found', code: 'NOT_FOUND' });
      return messageModel.listMessages(conversationId);
    })
    .then((messages) => {
      res.json({ success: true, message: 'OK', data: messages });
    })
    .catch((err) => sendError(res, err, 'Failed to load messages'));
}

function markAsRead(req, res) {
  const { messageId } = req.params;
  const userId = req.user?.id;
  messageModel.markAsRead(messageId, userId)
    .then((message) => {
      res.json({ success: true, message: 'Message marked as read', data: message });
    })
    .catch((err) => sendError(res, err, 'Failed to mark message as read'));
}

function deleteConversation(req, res) {
  const { id } = req.params;
  const userId = req.user?.id;
  const role = req.user?.role;

  messageModel.getConversation(id)
    .then((conversation) => {
      if (!conversation) {
        return res.status(404).json({ success: false, message: 'Conversation not found', code: 'NOT_FOUND' });
      }
      const isAdmin = role === 'super_admin' || role === 'admin';
      if (isAdmin) {
        return messageModel.deleteConversation(id)
          .then(() => res.json({ success: true, message: 'Conversation deleted' }));
      }
      return messageModel.isParticipant(id, userId)
        .then((isParticipant) => {
          if (!isParticipant) {
            return res.status(403).json({ success: false, message: 'You are not a participant of this conversation', code: 'FORBIDDEN' });
          }
          return messageModel.deleteConversation(id)
            .then(() => res.json({ success: true, message: 'Conversation deleted' }));
        });
    })
    .catch((err) => sendError(res, err, 'Failed to delete conversation'));
}

module.exports = {
  listConversations,
  getConversation,
  createConversation,
  sendMessage,
  listMessages,
  markAsRead,
  deleteConversation,
};

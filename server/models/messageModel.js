const crypto = require('crypto');
const db = require('../config/database');
const { buildViewUrl } = require('../services/messageAttachmentPublicFile');

const CREATE_CONVERSATIONS_TABLE_SQL = `CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  subject VARCHAR(255) DEFAULT NULL,
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_created_by (created_by),
  KEY idx_updated_at (updated_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

const CREATE_MESSAGES_TABLE_SQL = `CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  conversation_id VARCHAR(36) NOT NULL,
  sender_id INT NOT NULL,
  body TEXT NOT NULL,
  mentions JSON DEFAULT NULL,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_conversation (conversation_id),
  KEY idx_sender (sender_id),
  KEY idx_sent_at (sent_at DESC),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

const CREATE_MESSAGE_ATTACHMENTS_TABLE_SQL = `CREATE TABLE IF NOT EXISTS message_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message_id VARCHAR(36) NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) DEFAULT NULL,
  size_bytes BIGINT DEFAULT NULL,
  file_data LONGBLOB DEFAULT NULL,
  uploaded_by INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_message_attachments_message (message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

const CREATE_CONVERSATION_PARTICIPANTS_TABLE_SQL = `CREATE TABLE IF NOT EXISTS conversation_participants (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  conversation_id VARCHAR(36) NOT NULL,
  user_id INT NOT NULL,
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_conversation_user (conversation_id, user_id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

async function ensureTables() {
  try {
    await db.query(CREATE_CONVERSATIONS_TABLE_SQL);
    await db.query(CREATE_MESSAGES_TABLE_SQL);
    await db.query(CREATE_CONVERSATION_PARTICIPANTS_TABLE_SQL);
    await db.query(CREATE_MESSAGE_ATTACHMENTS_TABLE_SQL);
    // Add the mentions column on existing deployments (idempotent).
    await db.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS mentions JSON DEFAULT NULL AFTER body');
  } catch (err) {
    console.error('Failed to ensure messaging tables:', err.message);
  }
}

ensureTables();

const messageModel = {
  async createConversation({ subject, createdBy, participantIds }) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const conversationId = crypto.randomUUID();
      await conn.query(
        'INSERT INTO conversations (id, subject, created_by) VALUES (?, ?, ?)',
        [conversationId, subject || null, createdBy]
      );
      const allParticipants = [createdBy, ...(participantIds || [])];
      for (const userId of allParticipants) {
        await conn.query(
          'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)',
          [conversationId, userId]
        );
      }
      await conn.commit();
      return this.getConversation(conversationId);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async findDirectConversation(userA, userB) {
    const [rows] = await db.query(`
      SELECT c.id
      FROM conversations c
      INNER JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = ?
      INNER JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = ?
      WHERE (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id) = 2
      LIMIT 1
    `, [userA, userB]);
    if (!rows.length) return null;
    return this.getConversation(rows[0].id);
  },

  async getParticipants(conversationId) {
    const [rows] = await db.query(`
      SELECT cp.user_id as id, u.full_name, u.email, u.role, u.avatar_url
      FROM conversation_participants cp
      LEFT JOIN users u ON u.id = cp.user_id
      WHERE cp.conversation_id = ?
      ORDER BY cp.joined_at ASC
    `, [conversationId]);
    return rows;
  },

  async getConversation(id) {
    const [rows] = await db.query(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count,
        (SELECT MAX(sent_at) FROM messages WHERE conversation_id = c.id) as last_message_at,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND read_at IS NULL AND sender_id != c.created_by) as unread_count,
        (SELECT m.body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.sent_at DESC LIMIT 1) as last_message_body,
        (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id) as participant_count
      FROM conversations c WHERE c.id = ?
    `, [id]);
    const conversation = rows[0] || null;
    if (conversation) {
      const participants = await this.getParticipants(id);
      conversation.participants = participants;
      conversation.type = conversation.participant_count > 2 ? 'group_forum' : 'direct';
    }
    return conversation;
  },

  async listConversations(userId) {
    const [rows] = await db.query(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count,
        (SELECT MAX(sent_at) FROM messages WHERE conversation_id = c.id) as last_message_at,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND read_at IS NULL AND sender_id != ?) as unread_count,
        (SELECT m.body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.sent_at DESC LIMIT 1) as last_message_body,
        (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id) as participant_count
      FROM conversations c
      INNER JOIN conversation_participants cp ON cp.conversation_id = c.id
      WHERE cp.user_id = ?
      ORDER BY c.updated_at DESC
    `, [userId, userId]);

    const conversations = [];
    for (const row of rows) {
      const participants = await this.getParticipants(row.id);
      conversations.push({
        ...row,
        participants,
        type: row.participant_count > 2 ? 'group_forum' : 'direct',
      });
    }
    return conversations;
  },

  async addMessage({ conversationId, senderId, body, mentions, files }) {
    const id = crypto.randomUUID();
    await db.query(
      'INSERT INTO messages (id, conversation_id, sender_id, body, mentions) VALUES (?, ?, ?, ?, ?)',
      [id, conversationId, senderId, body, mentions ? JSON.stringify(mentions) : null]
    );

    const attachments = [];
    const fileList = Array.isArray(files) ? files : [];
    for (const file of fileList) {
      const originalName = file.originalname || 'attachment';
      const fileSize = file.size || (file.buffer ? file.buffer.length : 0);
      const [result] = await db.query(
        `INSERT INTO message_attachments (message_id, file_name, original_name, mime_type, size_bytes, file_data, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, originalName, originalName, file.mimetype || null, fileSize, file.buffer || null, senderId]
      );
      const attachment = await this.getMessageAttachmentById(result.insertId);
      attachments.push({ ...attachment, view_url: buildViewUrl(attachment.id) });
    }

    await db.query('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [conversationId]);
    const message = await this.getMessage(id);
    return { ...message, attachments };
  },

  async getMessageAttachmentById(attachmentId) {
    const [rows] = await db.query(
      'SELECT * FROM message_attachments WHERE id = ? LIMIT 1',
      [attachmentId]
    );
    return rows[0] || null;
  },

  async getMessageAttachments(messageId) {
    const [rows] = await db.query(
      `SELECT id, message_id, file_name, original_name, mime_type, size_bytes, uploaded_by, created_at
       FROM message_attachments WHERE message_id = ? ORDER BY created_at ASC`,
      [messageId]
    );
    return rows.map((att) => ({ ...att, view_url: buildViewUrl(att.id) }));
  },

  async getMessage(id) {
    const [rows] = await db.query(`
      SELECT m.*, u.full_name as sender_name, u.avatar_url as sender_avatar_url
      FROM messages m
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.id = ?
    `, [id]);
    const message = rows[0] || null;
    if (message) {
      message.attachments = await this.getMessageAttachments(id);
    }
    return message;
  },

  async listMessages(conversationId) {
    const [rows] = await db.query(`
      SELECT m.*, u.full_name as sender_name, u.avatar_url as sender_avatar_url
      FROM messages m
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.conversation_id = ?
      ORDER BY m.sent_at ASC
    `, [conversationId]);
    const messages = [];
    for (const m of rows) {
      messages.push({ ...m, attachments: await this.getMessageAttachments(m.id) });
    }
    return messages;
  },

  async markAsRead(messageId, userId) {
    await db.query(
      'UPDATE messages SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND sender_id != ? AND read_at IS NULL',
      [messageId, userId]
    );
    return this.getMessage(messageId);
  },

  async deleteConversation(id) {
    await db.query('DELETE FROM conversations WHERE id = ?', [id]);
    return { id };
  },

  async isParticipant(conversationId, userId) {
    const [rows] = await db.query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ? LIMIT 1',
      [conversationId, userId]
    );
    return rows.length > 0;
  },
};

module.exports = messageModel;

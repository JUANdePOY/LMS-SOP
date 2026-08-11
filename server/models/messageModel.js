const crypto = require('crypto');
const db = require('../config/database');

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
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_conversation (conversation_id),
  KEY idx_sender (sender_id),
  KEY idx_sent_at (sent_at DESC),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
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

  async addMessage({ conversationId, senderId, body }) {
    const id = crypto.randomUUID();
    await db.query(
      'INSERT INTO messages (id, conversation_id, sender_id, body) VALUES (?, ?, ?, ?)',
      [id, conversationId, senderId, body]
    );
    await db.query('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [conversationId]);
    return this.getMessage(id);
  },

  async getMessage(id) {
    const [rows] = await db.query(`
      SELECT m.*, u.full_name as sender_name, u.avatar_url as sender_avatar_url
      FROM messages m
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.id = ?
    `, [id]);
    return rows[0] || null;
  },

  async listMessages(conversationId) {
    const [rows] = await db.query(`
      SELECT m.*, u.full_name as sender_name, u.avatar_url as sender_avatar_url
      FROM messages m
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.conversation_id = ?
      ORDER BY m.sent_at ASC
    `, [conversationId]);
    return rows;
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

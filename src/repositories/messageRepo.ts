import { pool } from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Conversation {
  id: number;
  customer_id: number;
  artisan_id: number;
  product_id?: number;
  created_at: Date;
  customer_name?: string;
  artisan_name?: string;
  last_message?: string;
  unread_count?: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  body: string;
  is_read: boolean;
  created_at: Date;
  sender_name?: string;
}

export const messageRepo = {
  async findConversationsByUser(userId: number, role: string): Promise<Conversation[]> {
    const field = role === 'ARTISAN' ? 'artisan_id' : 'customer_id';
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT c.*,
              uc.name as customer_name,
              ua.name as artisan_name,
              (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
              (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND is_read = 0 AND sender_id != ?) as unread_count
       FROM conversations c
       JOIN users uc ON uc.id = c.customer_id
       JOIN users ua ON ua.id = c.artisan_id
       WHERE c.${field} = ?
       ORDER BY (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) DESC`,
      [userId, userId],
    );
    return rows as Conversation[];
  },

  async findConversation(id: number): Promise<Conversation | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT c.*, uc.name as customer_name, ua.name as artisan_name
       FROM conversations c
       JOIN users uc ON uc.id = c.customer_id
       JOIN users ua ON ua.id = c.artisan_id
       WHERE c.id = ?`,
      [id],
    );
    return (rows[0] as Conversation) || null;
  },

  async findOrCreate(customerId: number, artisanId: number, productId?: number): Promise<number> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM conversations WHERE customer_id = ? AND artisan_id = ?',
      [customerId, artisanId],
    );
    if (rows[0]) return rows[0].id as number;

    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO conversations (customer_id, artisan_id, product_id) VALUES (?, ?, ?)',
      [customerId, artisanId, productId || null],
    );
    return result.insertId;
  },

  async getMessages(conversationId: number, afterId?: number): Promise<Message[]> {
    const condition = afterId ? 'AND m.id > ?' : '';
    const params: (string | number | boolean | null | Date)[] = afterId ? [conversationId, afterId] : [conversationId];
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT m.*, u.name as sender_name FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = ? ${condition}
       ORDER BY m.created_at ASC`,
      params,
    );
    return rows as Message[];
  },

  async addMessage(conversationId: number, senderId: number, body: string): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)',
      [conversationId, senderId, body],
    );
    return result.insertId;
  },

  async markRead(conversationId: number, userId: number): Promise<void> {
    await pool.execute(
      'UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ?',
      [conversationId, userId],
    );
  },
};



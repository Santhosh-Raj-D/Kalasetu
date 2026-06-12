import { pool } from '../config/db';
import { Notification } from '../types';
import { RowDataPacket } from 'mysql2';

export const notificationRepo = {
  async findByUser(userId: number, limit = 20): Promise<Notification[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit],
    );
    return rows as Notification[];
  },

  async markAllRead(userId: number): Promise<void> {
    await pool.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
  },

  async unreadCount(userId: number): Promise<number> {
    const [[{ count }]] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId],
    );
    return count as number;
  },
};



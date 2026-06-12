import { pool } from '../config/db';

export async function createNotification(
  userId: number,
  type: string,
  title: string,
  body?: string,
  link?: string,
): Promise<void> {
  await pool.execute(
    'INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)',
    [userId, type, title, body || null, link || null],
  );
}

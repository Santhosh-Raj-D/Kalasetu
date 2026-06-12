import { pool } from '../config/db';
import { Review } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface ReviewWithCustomer extends Review {
  customer_name: string;
}

export const reviewRepo = {
  async findByProduct(productId: number): Promise<ReviewWithCustomer[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT r.*, u.name as customer_name FROM reviews r
       JOIN users u ON u.id = r.customer_id
       WHERE r.product_id = ?
       ORDER BY r.created_at DESC`,
      [productId],
    );
    return rows as ReviewWithCustomer[];
  },

  async hasVerifiedPurchase(customerId: number, productId: number): Promise<boolean> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT oi.id FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.customer_id = ? AND oi.product_id = ? AND o.status = 'DELIVERED'`,
      [customerId, productId],
    );
    return rows.length > 0;
  },

  async alreadyReviewed(customerId: number, productId: number): Promise<boolean> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM reviews WHERE customer_id = ? AND product_id = ?',
      [customerId, productId],
    );
    return rows.length > 0;
  },

  async create(data: Omit<Review, 'id' | 'created_at'>): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO reviews (product_id, customer_id, rating, comment) VALUES (?, ?, ?, ?)',
      [data.product_id, data.customer_id, data.rating, data.comment || null],
    );
    return result.insertId;
  },

  async getAverageRating(productId: number): Promise<{ avg: number; count: number }> {
    const [[row]] = await pool.execute<RowDataPacket[]>(
      'SELECT COALESCE(AVG(rating), 0) as avg, COUNT(*) as count FROM reviews WHERE product_id = ?',
      [productId],
    );
    return { avg: parseFloat(row.avg) || 0, count: row.count as number };
  },
};



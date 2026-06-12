import { pool } from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface VerificationReview {
  id: number;
  product_id: number;
  consultant_id: number;
  decision: 'APPROVED' | 'REJECTED';
  feedback?: string;
  reviewed_at: Date;
  product_name?: string;
  consultant_name?: string;
}

export const verificationRepo = {
  async create(data: Omit<VerificationReview, 'id' | 'reviewed_at'>): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO verification_reviews (product_id, consultant_id, decision, feedback) VALUES (?, ?, ?, ?)',
      [data.product_id, data.consultant_id, data.decision, data.feedback || null],
    );
    return result.insertId;
  },

  async findByConsultant(consultantId: number): Promise<VerificationReview[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT vr.*, p.name as product_name FROM verification_reviews vr
       JOIN products p ON p.id = vr.product_id
       WHERE vr.consultant_id = ?
       ORDER BY vr.reviewed_at DESC`,
      [consultantId],
    );
    return rows as VerificationReview[];
  },

  async findByProduct(productId: number): Promise<VerificationReview | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT vr.*, u.name as consultant_name FROM verification_reviews vr
       JOIN users u ON u.id = vr.consultant_id
       WHERE vr.product_id = ?
       ORDER BY vr.reviewed_at DESC LIMIT 1`,
      [productId],
    );
    return (rows[0] as VerificationReview) || null;
  },
};



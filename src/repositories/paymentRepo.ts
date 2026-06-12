import { pool } from '../config/db';
import { PaymentMethod, PaymentStatus } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Payment {
  id: number;
  order_id: number;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transaction_ref?: string;
  paid_at?: Date;
}

export const paymentRepo = {
  async findByOrderId(orderId: number): Promise<Payment | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM payments WHERE order_id = ?',
      [orderId],
    );
    return (rows[0] as Payment) || null;
  },

  async create(
    data: Omit<Payment, 'id'>,
    conn: import('mysql2/promise').Connection,
  ): Promise<number> {
    const [result] = await conn.execute<ResultSetHeader>(
      'INSERT INTO payments (order_id, amount, method, status, transaction_ref, paid_at) VALUES (?, ?, ?, ?, ?, ?)',
      [
        data.order_id,
        data.amount,
        data.method,
        data.status,
        data.transaction_ref || null,
        data.paid_at || null,
      ],
    );
    return result.insertId;
  },

  async findAll(filters: { page: number; limit: number; status?: PaymentStatus }): Promise<{ payments: (Payment & { order_number: string; customer_name: string })[]; total: number }> {
    const conditions: string[] = [];
    const params: (string | number | boolean | null | Date)[] = [];
    if (filters.status) { conditions.push('p.status = ?'); params.push(filters.status); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (filters.page - 1) * filters.limit;

    const [[{ total }]] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM payments p ${where}`,
      params,
    );
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.*, o.order_number, u.name as customer_name
       FROM payments p
       JOIN orders o ON o.id = p.order_id
       JOIN users u ON u.id = o.customer_id
       ${where}
       ORDER BY p.paid_at DESC, p.id DESC
       LIMIT ${filters.limit} OFFSET ${offset}`,
      params,
    );
    return { payments: rows as (Payment & { order_number: string; customer_name: string })[], total: total as number };
  },
};



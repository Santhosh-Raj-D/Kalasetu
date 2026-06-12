import { pool } from '../config/db';
import { Coupon } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export const couponRepo = {
  async findByCode(code: string): Promise<Coupon | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM coupons WHERE code = ?',
      [code.toUpperCase()],
    );
    return (rows[0] as Coupon) || null;
  },

  async findById(id: number): Promise<Coupon | null> {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM coupons WHERE id = ?', [id]);
    return (rows[0] as Coupon) || null;
  },

  async findAll(filters: { artisanId?: number | null; page: number; limit: number }): Promise<{ coupons: Coupon[]; total: number }> {
    const conditions: string[] = [];
    const params: (string | number | boolean | null | Date)[] = [];

    if (filters.artisanId !== undefined) {
      if (filters.artisanId === null) {
        conditions.push('artisan_id IS NULL');
      } else {
        conditions.push('artisan_id = ?');
        params.push(filters.artisanId);
      }
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (filters.page - 1) * filters.limit;

    const [[{ total }]] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM coupons ${where}`,
      params,
    );
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM coupons ${where} ORDER BY created_at DESC LIMIT ${filters.limit} OFFSET ${offset}`,
      params,
    );
    return { coupons: rows as Coupon[], total: total as number };
  },

  async create(data: Omit<Coupon, 'id' | 'used_count'>): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_uses, valid_from, valid_to, created_by, artisan_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.code.toUpperCase(), data.description || null, data.discount_type, data.discount_value,
        data.min_order_amount, data.max_uses, data.valid_from, data.valid_to,
        data.created_by, data.artisan_id || null, data.is_active ? 1 : 0,
      ],
    );
    return result.insertId;
  },

  async update(id: number, data: Partial<Coupon>): Promise<void> {
    const fields: string[] = [];
    const values: (string | number | boolean | null | Date)[] = [];
    const allowed: (keyof Coupon)[] = ['description', 'discount_type', 'discount_value', 'min_order_amount', 'max_uses', 'valid_from', 'valid_to', 'is_active'];
    for (const key of allowed) {
      if (data[key] !== undefined) { fields.push(`${key} = ?`); values.push(data[key]); }
    }
    if (fields.length === 0) return;
    values.push(id);
    await pool.execute(`UPDATE coupons SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async incrementUsed(id: number, conn: import('mysql2/promise').Connection): Promise<void> {
    await conn.execute('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [id]);
  },
};



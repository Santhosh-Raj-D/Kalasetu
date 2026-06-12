import { pool } from '../config/db';
import { SupportTicket, TicketStatus } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface TicketWithDetails extends SupportTicket {
  raised_by_name?: string;
  admin_name?: string;
}

export const ticketRepo = {
  async findById(id: number): Promise<TicketWithDetails | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.*, u.name as raised_by_name, a.name as admin_name
       FROM support_tickets t
       JOIN users u ON u.id = t.raised_by
       LEFT JOIN users a ON a.id = t.assigned_admin_id
       WHERE t.id = ?`,
      [id],
    );
    return (rows[0] as TicketWithDetails) || null;
  },

  async findByUser(userId: number, page: number, limit: number): Promise<{ tickets: TicketWithDetails[]; total: number }> {
    const offset = (page - 1) * limit;
    const [[{ total }]] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM support_tickets WHERE raised_by = ?',
      [userId],
    );
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM support_tickets WHERE raised_by = ? ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      [userId],
    );
    return { tickets: rows as TicketWithDetails[], total: total as number };
  },

  async findAll(filters: { status?: TicketStatus; page: number; limit: number }): Promise<{ tickets: TicketWithDetails[]; total: number }> {
    const conditions: string[] = [];
    const params: (string | number | boolean | null | Date)[] = [];
    if (filters.status) { conditions.push('t.status = ?'); params.push(filters.status); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (filters.page - 1) * filters.limit;

    const [[{ total }]] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM support_tickets t ${where}`,
      params,
    );
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.*, u.name as raised_by_name FROM support_tickets t
       JOIN users u ON u.id = t.raised_by
       ${where} ORDER BY t.created_at DESC LIMIT ${filters.limit} OFFSET ${offset}`,
      params,
    );
    return { tickets: rows as TicketWithDetails[], total: total as number };
  },

  async create(data: Pick<SupportTicket, 'raised_by' | 'order_id' | 'subject' | 'description'>): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO support_tickets (raised_by, order_id, subject, description) VALUES (?, ?, ?, ?)',
      [data.raised_by, data.order_id || null, data.subject, data.description],
    );
    return result.insertId;
  },

  async update(id: number, data: Partial<Pick<SupportTicket, 'status' | 'assigned_admin_id' | 'resolution_note'>>): Promise<void> {
    const fields: string[] = [];
    const values: (string | number | boolean | null | Date)[] = [];
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.assigned_admin_id !== undefined) { fields.push('assigned_admin_id = ?'); values.push(data.assigned_admin_id); }
    if (data.resolution_note !== undefined) { fields.push('resolution_note = ?'); values.push(data.resolution_note); }
    if (data.status === 'RESOLVED') { fields.push('resolved_at = NOW()'); }
    if (fields.length === 0) return;
    values.push(id);
    await pool.execute(`UPDATE support_tickets SET ${fields.join(', ')} WHERE id = ?`, values);
  },
};



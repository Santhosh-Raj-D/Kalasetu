import { pool } from '../config/db';
import { BulkInquiry, InquiryStatus } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface InquiryWithDetails extends BulkInquiry {
  product_name?: string;
  product_slug?: string;
  business_name_user?: string;
  artisan_name?: string;
  quoted_unit_price?: number;
  lead_time_days?: number;
  quote_notes?: string;
}

export const inquiryRepo = {
  async findById(id: number): Promise<InquiryWithDetails | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT bi.*, p.name as product_name, p.slug as product_slug, p.artisan_id,
              ub.name as business_name_user,
              iq.quoted_unit_price, iq.lead_time_days, iq.notes as quote_notes
       FROM bulk_inquiries bi
       JOIN products p ON p.id = bi.product_id
       JOIN users ub ON ub.id = bi.business_user_id
       LEFT JOIN inquiry_quotes iq ON iq.inquiry_id = bi.id
       WHERE bi.id = ?`,
      [id],
    );
    return (rows[0] as InquiryWithDetails) || null;
  },

  async findByBusiness(businessUserId: number): Promise<InquiryWithDetails[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT bi.*, p.name as product_name, p.slug as product_slug,
              ua.name as artisan_name,
              iq.quoted_unit_price, iq.lead_time_days
       FROM bulk_inquiries bi
       JOIN products p ON p.id = bi.product_id
       JOIN users ua ON ua.id = p.artisan_id
       LEFT JOIN inquiry_quotes iq ON iq.inquiry_id = bi.id
       WHERE bi.business_user_id = ?
       ORDER BY bi.created_at DESC`,
      [businessUserId],
    );
    return rows as InquiryWithDetails[];
  },

  async findByArtisan(artisanId: number): Promise<InquiryWithDetails[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT bi.*, p.name as product_name, p.slug as product_slug,
              ub.name as business_name_user,
              iq.quoted_unit_price, iq.lead_time_days
       FROM bulk_inquiries bi
       JOIN products p ON p.id = bi.product_id
       JOIN users ub ON ub.id = bi.business_user_id
       LEFT JOIN inquiry_quotes iq ON iq.inquiry_id = bi.id
       WHERE p.artisan_id = ?
       ORDER BY bi.created_at DESC`,
      [artisanId],
    );
    return rows as InquiryWithDetails[];
  },

  async create(data: Omit<BulkInquiry, 'id' | 'created_at'>): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO bulk_inquiries (business_user_id, product_id, quantity, target_price, message, status) VALUES (?, ?, ?, ?, ?, ?)',
      [data.business_user_id, data.product_id, data.quantity, data.target_price || null, data.message || null, 'OPEN'],
    );
    return result.insertId;
  },

  async addQuote(inquiryId: number, artisanId: number, unitPrice: number, leadTime: number, notes?: string): Promise<void> {
    await pool.execute(
      'INSERT INTO inquiry_quotes (inquiry_id, artisan_id, quoted_unit_price, lead_time_days, notes) VALUES (?, ?, ?, ?, ?)',
      [inquiryId, artisanId, unitPrice, leadTime, notes || null],
    );
  },

  async updateStatus(id: number, status: InquiryStatus): Promise<void> {
    await pool.execute('UPDATE bulk_inquiries SET status = ? WHERE id = ?', [status, id]);
  },
};



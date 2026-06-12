import { pool } from '../config/db';
import { Order, OrderItem, OrderStatus } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface OrderWithItems extends Order {
  items?: OrderItemWithProduct[];
  customer_name?: string;
  customer_email?: string;
}

export interface OrderItemWithProduct extends OrderItem {
  product_name?: string;
  product_slug?: string;
  primary_image?: string;
  artisan_name?: string;
}

export const orderRepo = {
  async findById(id: number): Promise<OrderWithItems | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT o.*, u.name as customer_name, u.email as customer_email
       FROM orders o JOIN users u ON u.id = o.customer_id WHERE o.id = ?`,
      [id],
    );
    if (!rows[0]) return null;
    const order = rows[0] as OrderWithItems;
    order.items = await orderRepo.getItems(id);
    return order;
  },

  async findByCustomer(customerId: number, page: number, limit: number): Promise<{ orders: OrderWithItems[]; total: number }> {
    const offset = (page - 1) * limit;
    const [[{ total }]] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM orders WHERE customer_id = ?',
      [customerId],
    );
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      [customerId],
    );
    return { orders: rows as OrderWithItems[], total: total as number };
  },

  async findByArtisan(artisanId: number, page: number, limit: number): Promise<{ orders: OrderWithItems[]; total: number }> {
    const offset = (page - 1) * limit;
    const [[{ total }]] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(DISTINCT o.id) as total FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE oi.artisan_id = ?',
      [artisanId],
    );
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT DISTINCT o.*, u.name as customer_name
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN users u ON u.id = o.customer_id
       WHERE oi.artisan_id = ?
       ORDER BY o.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      [artisanId],
    );
    return { orders: rows as OrderWithItems[], total: total as number };
  },

  async findAll(filters: { status?: OrderStatus; page: number; limit: number }): Promise<{ orders: OrderWithItems[]; total: number }> {
    const conditions: string[] = [];
    const params: (string | number | boolean | null | Date)[] = [];
    if (filters.status) { conditions.push('o.status = ?'); params.push(filters.status); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (filters.page - 1) * filters.limit;

    const [[{ total }]] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM orders o ${where}`,
      params,
    );
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT o.*, u.name as customer_name FROM orders o JOIN users u ON u.id = o.customer_id ${where} ORDER BY o.created_at DESC LIMIT ${filters.limit} OFFSET ${offset}`,
      params,
    );
    return { orders: rows as OrderWithItems[], total: total as number };
  },

  async create(data: Omit<Order, 'id' | 'created_at'>, conn: import('mysql2/promise').Connection): Promise<number> {
    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO orders (order_number, customer_id, subtotal, discount_amount, total, coupon_id, status, ship_name, ship_phone, ship_address, ship_city, ship_state, ship_pincode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.order_number, data.customer_id, data.subtotal, data.discount_amount, data.total,
        data.coupon_id || null, data.status, data.ship_name, data.ship_phone,
        data.ship_address, data.ship_city, data.ship_state, data.ship_pincode,
      ],
    );
    return result.insertId;
  },

  async addItem(orderId: number, item: Omit<OrderItem, 'id' | 'order_id'>, conn: import('mysql2/promise').Connection): Promise<void> {
    await conn.execute(
      'INSERT INTO order_items (order_id, product_id, artisan_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
      [orderId, item.product_id, item.artisan_id, item.quantity, item.unit_price],
    );
  },

  async getItems(orderId: number): Promise<OrderItemWithProduct[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT oi.*, p.name as product_name, p.slug as product_slug, u.name as artisan_name,
              (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       JOIN users u ON u.id = oi.artisan_id
       WHERE oi.order_id = ?`,
      [orderId],
    );
    return rows as OrderItemWithProduct[];
  },

  async updateStatus(id: number, status: OrderStatus): Promise<void> {
    await pool.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
  },

  async canArtisanUpdateOrder(orderId: number, artisanId: number): Promise<boolean> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM order_items WHERE order_id = ? AND artisan_id = ?',
      [orderId, artisanId],
    );
    return rows.length > 0;
  },
};



import { pool } from '../config/db';
import { RowDataPacket } from 'mysql2';

export const analyticsRepo = {
  async adminSummary() {
    const [[gmv]] = await pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(SUM(p.amount), 0) as gmv, COUNT(DISTINCT o.id) as total_orders
       FROM orders o LEFT JOIN payments p ON p.order_id = o.id AND p.status = 'SUCCESS'
       WHERE o.status != 'CANCELLED'`,
    );
    const [[users]] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM users',
    );
    const [[products]] = await pool.execute<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM products WHERE status = 'APPROVED'",
    );
    return {
      gmv: parseFloat(gmv.gmv) || 0,
      total_orders: gmv.total_orders as number,
      total_users: users.total as number,
      active_products: products.total as number,
    };
  },

  async ordersPerDay(days = 30): Promise<{ date: string; count: number; revenue: number }[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT DATE(o.created_at) as date,
              COUNT(o.id) as count,
              COALESCE(SUM(p.amount), 0) as revenue
       FROM orders o
       LEFT JOIN payments p ON p.order_id = o.id AND p.status = 'SUCCESS'
       WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(o.created_at)
       ORDER BY date ASC`,
      [days],
    );
    return rows as { date: string; count: number; revenue: number }[];
  },

  async topCategories(limit = 5): Promise<{ name: string; total: number }[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT c.name, COUNT(oi.id) as total
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       JOIN categories c ON c.id = p.category_id
       GROUP BY c.id ORDER BY total DESC LIMIT ?`,
      [limit],
    );
    return rows as { name: string; total: number }[];
  },

  async topArtisans(limit = 5): Promise<{ name: string; revenue: number }[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT u.name, SUM(oi.quantity * oi.unit_price) as revenue
       FROM order_items oi
       JOIN users u ON u.id = oi.artisan_id
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status != 'CANCELLED'
       GROUP BY oi.artisan_id ORDER BY revenue DESC LIMIT ?`,
      [limit],
    );
    return rows as { name: string; revenue: number }[];
  },

  async userGrowth(days = 30): Promise<{ date: string; count: number }[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM users
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(created_at) ORDER BY date ASC`,
      [days],
    );
    return rows as { date: string; count: number }[];
  },

  async artisanSummary(artisanId: number) {
    const [[revenue]] = await pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE oi.artisan_id = ? AND o.status != 'CANCELLED'`,
      [artisanId],
    );
    const [[orders]] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT o.id) as total FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE oi.artisan_id = ? AND o.status != 'CANCELLED'`,
      [artisanId],
    );
    const [[products]] = await pool.execute<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM products WHERE artisan_id = ? AND status = 'APPROVED'",
      [artisanId],
    );
    return {
      total_revenue: parseFloat(revenue.total) || 0,
      total_orders: orders.total as number,
      active_products: products.total as number,
    };
  },

  async artisanRevenue(artisanId: number, days = 30): Promise<{ date: string; revenue: number }[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT DATE(o.created_at) as date, SUM(oi.quantity * oi.unit_price) as revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.artisan_id = ? AND o.status != 'CANCELLED'
         AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(o.created_at) ORDER BY date ASC`,
      [artisanId, days],
    );
    return rows as { date: string; revenue: number }[];
  },

  async artisanTopProducts(artisanId: number, limit = 5): Promise<{ name: string; sold: number; revenue: number }[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.name, SUM(oi.quantity) as sold, SUM(oi.quantity * oi.unit_price) as revenue
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.artisan_id = ? AND o.status != 'CANCELLED'
       GROUP BY oi.product_id ORDER BY sold DESC LIMIT ?`,
      [artisanId, limit],
    );
    return rows as { name: string; sold: number; revenue: number }[];
  },
};



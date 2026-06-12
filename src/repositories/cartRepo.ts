import { pool } from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface CartItemWithProduct {
  id: number;
  user_id: number;
  product_id: number;
  quantity: number;
  product_name: string;
  product_slug: string;
  price: number;
  stock: number;
  primary_image?: string;
  artisan_id: number;
  artisan_name: string;
  status: string;
}

export const cartRepo = {
  async findByUser(userId: number): Promise<CartItemWithProduct[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT ci.*, p.name as product_name, p.slug as product_slug, p.price, p.stock, p.artisan_id, p.status,
              u.name as artisan_name,
              (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       JOIN users u ON u.id = p.artisan_id
       WHERE ci.user_id = ?`,
      [userId],
    );
    return rows as CartItemWithProduct[];
  },

  async upsert(userId: number, productId: number, quantity: number): Promise<void> {
    await pool.execute(
      `INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = ?`,
      [userId, productId, quantity, quantity],
    );
  },

  async updateQuantity(userId: number, itemId: number, quantity: number): Promise<void> {
    await pool.execute(
      'UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?',
      [quantity, itemId, userId],
    );
  },

  async remove(userId: number, itemId: number): Promise<void> {
    await pool.execute('DELETE FROM cart_items WHERE id = ? AND user_id = ?', [itemId, userId]);
  },

  async clear(userId: number, conn?: import('mysql2/promise').Connection): Promise<void> {
    const executor = conn || pool;
    await executor.execute('DELETE FROM cart_items WHERE user_id = ?', [userId]);
  },

  async findItem(userId: number, productId: number): Promise<{ id: number; quantity: number } | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?',
      [userId, productId],
    );
    return (rows[0] as { id: number; quantity: number }) || null;
  },
};

export const wishlistRepo = {
  async findByUser(userId: number): Promise<CartItemWithProduct[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT wi.id, wi.user_id, wi.product_id, 1 as quantity, p.name as product_name, p.slug as product_slug,
              p.price, p.stock, p.artisan_id, p.status, u.name as artisan_name,
              (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
       FROM wishlist_items wi
       JOIN products p ON p.id = wi.product_id
       JOIN users u ON u.id = p.artisan_id
       WHERE wi.user_id = ?`,
      [userId],
    );
    return rows as CartItemWithProduct[];
  },

  async add(userId: number, productId: number): Promise<void> {
    await pool.execute(
      'INSERT IGNORE INTO wishlist_items (user_id, product_id) VALUES (?, ?)',
      [userId, productId],
    );
  },

  async remove(userId: number, productId: number): Promise<void> {
    await pool.execute(
      'DELETE FROM wishlist_items WHERE user_id = ? AND product_id = ?',
      [userId, productId],
    );
  },

  async exists(userId: number, productId: number): Promise<boolean> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM wishlist_items WHERE user_id = ? AND product_id = ?',
      [userId, productId],
    );
    return rows.length > 0;
  },
};



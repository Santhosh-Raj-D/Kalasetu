import { pool } from '../config/db';
import { Product, ProductStatus } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface ProductWithExtras extends Product {
  artisan_name?: string;
  category_name?: string;
  primary_image?: string;
  avg_rating?: number;
  review_count?: number;
}

export const productRepo = {
  async findById(id: number): Promise<ProductWithExtras | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.*, u.name as artisan_name, c.name as category_name,
              (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image,
              COALESCE(AVG(r.rating), 0) as avg_rating,
              COUNT(DISTINCT r.id) as review_count
       FROM products p
       JOIN users u ON u.id = p.artisan_id
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN reviews r ON r.product_id = p.id
       WHERE p.id = ?
       GROUP BY p.id`,
      [id],
    );
    return (rows[0] as ProductWithExtras) || null;
  },

  async findBySlug(slug: string): Promise<ProductWithExtras | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.*, u.name as artisan_name, c.name as category_name,
              COALESCE(AVG(r.rating), 0) as avg_rating,
              COUNT(DISTINCT r.id) as review_count
       FROM products p
       JOIN users u ON u.id = p.artisan_id
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN reviews r ON r.product_id = p.id
       WHERE p.slug = ?
       GROUP BY p.id`,
      [slug],
    );
    return (rows[0] as ProductWithExtras) || null;
  },

  async findPublic(filters: {
    search?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    featured?: boolean;
    page: number;
    limit: number;
  }): Promise<{ products: ProductWithExtras[]; total: number }> {
    const conditions = ['p.status = ?', 'p.stock > 0'];
    const params: (string | number | boolean | null | Date)[] = ['APPROVED'];

    if (filters.search) {
      conditions.push('(p.name LIKE ? OR p.description LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    if (filters.category) {
      conditions.push('c.slug = ?');
      params.push(filters.category);
    }
    if (filters.minPrice !== undefined) {
      conditions.push('p.price >= ?');
      params.push(filters.minPrice);
    }
    if (filters.maxPrice !== undefined) {
      conditions.push('p.price <= ?');
      params.push(filters.maxPrice);
    }
    if (filters.featured) {
      conditions.push('p.is_featured = 1');
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    let orderBy = 'ORDER BY p.created_at DESC';
    if (filters.sort === 'price_asc') orderBy = 'ORDER BY p.price ASC';
    else if (filters.sort === 'price_desc') orderBy = 'ORDER BY p.price DESC';
    else if (filters.sort === 'rating') orderBy = 'ORDER BY avg_rating DESC';

    const offset = (filters.page - 1) * filters.limit;

    const [[{ total }]] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT p.id) as total FROM products p JOIN categories c ON c.id = p.category_id ${where}`,
      params,
    );

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.*, u.name as artisan_name, c.name as category_name,
              (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image,
              COALESCE(AVG(r.rating), 0) as avg_rating,
              COUNT(DISTINCT r.id) as review_count
       FROM products p
       JOIN users u ON u.id = p.artisan_id
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN reviews r ON r.product_id = p.id
       ${where}
       GROUP BY p.id
       ${orderBy}
       LIMIT ${filters.limit} OFFSET ${offset}`,
      params,
    );

    return { products: rows as ProductWithExtras[], total: total as number };
  },

  async findByArtisan(artisanId: number): Promise<ProductWithExtras[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.*, c.name as category_name,
              (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.artisan_id = ?
       ORDER BY p.created_at DESC`,
      [artisanId],
    );
    return rows as ProductWithExtras[];
  },

  async findPendingReview(): Promise<ProductWithExtras[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.*, u.name as artisan_name, c.name as category_name,
              (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
       FROM products p
       JOIN users u ON u.id = p.artisan_id
       JOIN categories c ON c.id = p.category_id
       WHERE p.status = 'PENDING_REVIEW'
       ORDER BY p.created_at ASC`,
    );
    return rows as ProductWithExtras[];
  },

  async create(data: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO products (artisan_id, category_id, name, slug, description, craft_technique, materials, price, stock, status, is_featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.artisan_id, data.category_id, data.name, data.slug, data.description,
        data.craft_technique || null, data.materials || null, data.price, data.stock,
        data.status || 'DRAFT', data.is_featured ? 1 : 0,
      ],
    );
    return result.insertId;
  },

  async update(id: number, data: Partial<Product>): Promise<void> {
    const fields: string[] = [];
    const values: (string | number | boolean | null | Date)[] = [];

    const allowed: (keyof Product)[] = ['name', 'slug', 'description', 'craft_technique', 'materials', 'price', 'stock', 'status', 'is_featured', 'cultural_notes', 'category_id'];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (fields.length === 0) return;
    values.push(id);
    await pool.execute(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async updateStatus(id: number, status: ProductStatus, culturalNotes?: string): Promise<void> {
    if (culturalNotes !== undefined) {
      await pool.execute('UPDATE products SET status = ?, cultural_notes = ? WHERE id = ?', [status, culturalNotes, id]);
    } else {
      await pool.execute('UPDATE products SET status = ? WHERE id = ?', [status, id]);
    }
  },

  async addImage(productId: number, imagePath: string, isPrimary: boolean): Promise<void> {
    await pool.execute(
      'INSERT INTO product_images (product_id, image_path, is_primary) VALUES (?, ?, ?)',
      [productId, imagePath, isPrimary ? 1 : 0],
    );
  },

  async getImages(productId: number): Promise<{ id: number; image_path: string; is_primary: boolean }[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC',
      [productId],
    );
    return rows as { id: number; image_path: string; is_primary: boolean }[];
  },

  async deleteImages(productId: number): Promise<void> {
    await pool.execute('DELETE FROM product_images WHERE product_id = ?', [productId]);
  },

  async findAllAdmin(filters: { status?: ProductStatus; page: number; limit: number }): Promise<{ products: ProductWithExtras[]; total: number }> {
    const conditions: string[] = [];
    const params: (string | number | boolean | null | Date)[] = [];

    if (filters.status) { conditions.push('p.status = ?'); params.push(filters.status); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (filters.page - 1) * filters.limit;

    const [[{ total }]] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM products p ${where}`,
      params,
    );

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.*, u.name as artisan_name, c.name as category_name,
              (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
       FROM products p
       JOIN users u ON u.id = p.artisan_id
       JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT ${filters.limit} OFFSET ${offset}`,
      params,
    );

    return { products: rows as ProductWithExtras[], total: total as number };
  },

  async slugExists(slug: string, excludeId?: number): Promise<boolean> {
    const query = excludeId
      ? 'SELECT id FROM products WHERE slug = ? AND id != ?'
      : 'SELECT id FROM products WHERE slug = ?';
    const params = excludeId ? [slug, excludeId] : [slug];
    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    return rows.length > 0;
  },

  async findFeatured(limit = 6): Promise<ProductWithExtras[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.*, u.name as artisan_name, c.name as category_name,
              (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image,
              COALESCE(AVG(r.rating), 0) as avg_rating
       FROM products p
       JOIN users u ON u.id = p.artisan_id
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN reviews r ON r.product_id = p.id
       WHERE p.status = 'APPROVED' AND p.stock > 0 AND p.is_featured = 1
       GROUP BY p.id
       LIMIT ?`,
      [limit],
    );
    return rows as ProductWithExtras[];
  },
};



import { pool } from '../config/db';
import { Category } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export const categoryRepo = {
  async findAll(): Promise<Category[]> {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM categories ORDER BY name');
    return rows as Category[];
  },

  async findById(id: number): Promise<Category | null> {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM categories WHERE id = ?', [id]);
    return (rows[0] as Category) || null;
  },

  async findBySlug(slug: string): Promise<Category | null> {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM categories WHERE slug = ?', [slug]);
    return (rows[0] as Category) || null;
  },

  async create(data: Omit<Category, 'id'>): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO categories (name, slug, description, image) VALUES (?, ?, ?, ?)',
      [data.name, data.slug, data.description || null, data.image || null],
    );
    return result.insertId;
  },

  async update(id: number, data: Partial<Omit<Category, 'id'>>): Promise<void> {
    const fields: string[] = [];
    const values: (string | number | boolean | null | Date)[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.slug !== undefined) { fields.push('slug = ?'); values.push(data.slug); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.image !== undefined) { fields.push('image = ?'); values.push(data.image); }
    if (fields.length === 0) return;
    values.push(id);
    await pool.execute(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, values);
  },
};



import { pool } from '../config/db';
import { User, Role, UserStatus } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export const userRepo = {
  async findById(id: number): Promise<User | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, name, email, role, phone, is_business, business_name, status, created_at FROM users WHERE id = ?',
      [id],
    );
    return (rows[0] as User) || null;
  },

  async findByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, name, email, password_hash, role, phone, is_business, business_name, status, created_at FROM users WHERE email = ?',
      [email],
    );
    return (rows[0] as User & { password_hash: string }) || null;
  },

  async create(data: {
    name: string;
    email: string;
    password_hash: string;
    role: Role;
    phone?: string;
    is_business?: boolean;
    business_name?: string;
    status?: UserStatus;
  }): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO users (name, email, password_hash, role, phone, is_business, business_name, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        data.name,
        data.email,
        data.password_hash,
        data.role,
        data.phone || null,
        data.is_business ? 1 : 0,
        data.business_name || null,
        data.status || 'ACTIVE',
      ],
    );
    return result.insertId;
  },

  async update(
    id: number,
    data: Partial<Pick<User, 'name' | 'phone' | 'business_name'>> & { password_hash?: string },
  ): Promise<void> {
    const fields: string[] = [];
    const values: (string | number | boolean | null | Date)[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
    if (data.business_name !== undefined) { fields.push('business_name = ?'); values.push(data.business_name); }
    if (data.password_hash !== undefined) { fields.push('password_hash = ?'); values.push(data.password_hash); }

    if (fields.length === 0) return;
    values.push(id);
    await pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async updateStatus(id: number, status: UserStatus): Promise<void> {
    await pool.execute('UPDATE users SET status = ? WHERE id = ?', [status, id]);
  },

  async findAll(filters: { role?: Role; status?: UserStatus; page: number; limit: number }): Promise<{ users: User[]; total: number }> {
    const conditions: string[] = [];
    const params: (string | number | boolean | null | Date)[] = [];

    if (filters.role) { conditions.push('role = ?'); params.push(filters.role); }
    if (filters.status) { conditions.push('status = ?'); params.push(filters.status); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (filters.page - 1) * filters.limit;

    const [[{ total }]] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM users ${where}`,
      params,
    );

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, name, email, role, phone, is_business, business_name, status, created_at FROM users ${where} ORDER BY created_at DESC LIMIT ${filters.limit} OFFSET ${offset}`,
      params,
    );

    return { users: rows as User[], total: total as number };
  },

  async findArtisans(): Promise<User[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.is_business, u.business_name, u.status, u.created_at
       FROM users u WHERE u.role = 'ARTISAN' AND u.status = 'ACTIVE'`,
    );
    return rows as User[];
  },
};



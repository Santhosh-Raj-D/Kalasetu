import { pool } from '../config/db';
import { ArtisanProfile } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export const artisanRepo = {
  async findByUserId(userId: number): Promise<ArtisanProfile | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM artisan_profiles WHERE user_id = ?',
      [userId],
    );
    return (rows[0] as ArtisanProfile) || null;
  },

  async upsert(data: ArtisanProfile): Promise<void> {
    await pool.execute(
      `INSERT INTO artisan_profiles (user_id, tribe_name, region, craft_tradition, story, years_experience, profile_image, cover_image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         tribe_name = VALUES(tribe_name),
         region = VALUES(region),
         craft_tradition = VALUES(craft_tradition),
         story = VALUES(story),
         years_experience = VALUES(years_experience),
         profile_image = COALESCE(VALUES(profile_image), profile_image),
         cover_image = COALESCE(VALUES(cover_image), cover_image)`,
      [
        data.user_id,
        data.tribe_name,
        data.region,
        data.craft_tradition,
        data.story || null,
        data.years_experience || 0,
        data.profile_image || null,
        data.cover_image || null,
      ],
    );
  },

  async updateImages(userId: number, profileImage?: string, coverImage?: string): Promise<void> {
    const fields: string[] = [];
    const values: (string | number | boolean | null | Date)[] = [];
    if (profileImage) { fields.push('profile_image = ?'); values.push(profileImage); }
    if (coverImage) { fields.push('cover_image = ?'); values.push(coverImage); }
    if (fields.length === 0) return;
    values.push(userId);
    await pool.execute(`UPDATE artisan_profiles SET ${fields.join(', ')} WHERE user_id = ?`, values);
  },

  async findAllWithProfiles(): Promise<(ArtisanProfile & { name: string; email: string })[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT ap.*, u.name, u.email FROM artisan_profiles ap
       JOIN users u ON u.id = ap.user_id
       WHERE u.status = 'ACTIVE'`,
    );
    return rows as (ArtisanProfile & { name: string; email: string })[];
  },

  async create(userId: number): Promise<void> {
    await pool.execute<ResultSetHeader>(
      `INSERT IGNORE INTO artisan_profiles (user_id, tribe_name, region, craft_tradition) VALUES (?, '', '', '')`,
      [userId],
    );
  },
};



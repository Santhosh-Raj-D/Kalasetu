import { pool } from '../config/db';
import fs from 'fs';
import path from 'path';

async function runSeed() {
  try {
    const seedSql = fs.readFileSync(path.join(__dirname, '../../db/seed.sql'), 'utf8');
    // Split on semicolons and run each statement
    const statements = seedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      try {
        await pool.execute(stmt);
      } catch (err: unknown) {
        const error = err as { code?: string; message?: string };
        // Ignore duplicate entry errors during re-seeding
        if (error.code !== 'ER_DUP_ENTRY') {
          console.warn('Statement warning:', error.message, '\nSQL:', stmt.substring(0, 100));
        }
      }
    }
    console.log('Seed completed successfully!');
    console.log('\nDemo credentials (all passwords: Admin@123):');
    console.log('  Admin:      admin@kalasetu.in');
    console.log('  Consultant: consultant@kalasetu.in');
    console.log('  Artisan:    ramesh@kalasetu.in | lalita@kalasetu.in | suresh@kalasetu.in | kamla@kalasetu.in');
    console.log('  Customer:   customer1@kalasetu.in | customer2@kalasetu.in');
    console.log('  Business:   business@kalasetu.in');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

runSeed();

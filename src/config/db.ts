import mysql from 'mysql2/promise';
import type { ExecuteValues } from 'mysql2';
import dotenv from 'dotenv';

// Convenience alias for SQL parameter arrays
export type SqlValues = ExecuteValues[];

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'kalasetu',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
});

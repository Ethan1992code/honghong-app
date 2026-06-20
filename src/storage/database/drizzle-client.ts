import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './shared/schema';

// 环境变量应该由 Next.js 自动加载
// 检查 DATABASE_URL 是否已设置
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in environment');
  console.error('Current env vars:', Object.keys(process.env).filter(k => k.includes('DATABASE')));
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Please check your .env.local file.');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export const db = drizzle(pool, { schema });

console.log('[Drizzle] Database client initialized');

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './shared/schema';

const DATABASE_URL = process.env.DATABASE_URL;

let db: ReturnType<typeof drizzle> | null = null;

if (DATABASE_URL) {
  try {
    const pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    db = drizzle(pool, { schema });
    console.log('[Drizzle] Database client initialized');
  } catch (error) {
    console.error('[Drizzle] Failed to initialize database client:', error);
    db = null;
  }
} else {
  console.warn('[Drizzle] DATABASE_URL is not set, database operations will be unavailable');
}

export { db };

export const ensureDb = () => {
  if (!db) {
    throw new Error('Database client is not initialized. Please check your DATABASE_URL environment variable.');
  }
  return db;
};
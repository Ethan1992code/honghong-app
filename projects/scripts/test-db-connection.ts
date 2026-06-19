import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { config } from 'dotenv';
import path from 'path';
import * as schema from '../src/storage/database/shared/schema';

async function testConnection() {
  // 加载环境变量
  const envPath = path.resolve(process.cwd(), '.env.local');
  const result = config({ path: envPath });
  
  if (result.error) {
    console.error('Error loading .env.local:', result.error);
    return;
  }
  
  console.log('Environment variables loaded');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set!');
    return;
  }
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });
  
  const db = drizzle(pool, { schema });
  
  try {
    // 测试查询users表
    console.log('\nTesting database connection...');
    
    const result = await pool.query('SELECT * FROM users LIMIT 5');
    console.log('Users table query successful!');
    console.log('Number of users:', result.rows.length);
    
    if (result.rows.length > 0) {
      console.log('Sample user:', result.rows[0]);
    }
    
    // 测试schema字段
    console.log('\nTesting schema fields...');
    const users = await db.select().from(schema.users).limit(5);
    console.log('Drizzle query successful!');
    console.log('Number of users (via Drizzle):', users.length);
    if (users.length > 0) {
      console.log('Sample user (via Drizzle):', users[0]);
      console.log('Available fields:', Object.keys(users[0]));
    }
    
    console.log('\n✅ Database connection and schema working correctly!');
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testConnection();

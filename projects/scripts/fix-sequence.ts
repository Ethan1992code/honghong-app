import { Pool } from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });

async function fixSequence() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    // 先查询当前最大的用户ID
    const result = await client.query('SELECT MAX(id) as max_id FROM users');
    const maxId = result.rows[0].max_id || 0;
    console.log(`当前最大用户ID: ${maxId}`);
    
    // 将序列重置为比最大ID大100
    const newStart = maxId + 100;
    await client.query(`ALTER SEQUENCE users_id_seq RESTART WITH ${newStart}`);
    console.log(`序列已重置为: ${newStart}`);
  } finally {
    client.release();
    await pool.end();
  }
}

fixSequence().catch(console.error);
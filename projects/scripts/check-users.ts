import { Pool } from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });

async function checkUsersTable() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    // 查询所有用户
    const usersResult = await client.query('SELECT id, username FROM users ORDER BY id');
    console.log('当前用户列表:');
    console.log(usersResult.rows);
    
    // 查询序列当前值
    const sequenceResult = await client.query("SELECT last_value FROM users_id_seq");
    console.log(`序列当前值: ${sequenceResult.rows[0].last_value}`);
    
    // 查看序列状态
    const sequenceStatus = await client.query("SELECT currval('users_id_seq')");
    console.log(`序列当前值(currval): ${sequenceStatus.rows[0].currval}`);
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkUsersTable().catch(console.error);
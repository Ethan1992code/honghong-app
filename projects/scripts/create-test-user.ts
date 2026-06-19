import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function createTestUser() {
  const client = await pool.connect();
  
  try {
    console.log('开始创建用户...');
    
    // 先重置序列
    await client.query(`
      SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 0) FROM users) + 1, false)
    `);
    console.log('✓ 序列已重置');
    
    // 检查用户是否已存在
    const existingUser = await client.query(
      'SELECT id FROM users WHERE username = $1',
      ['Ethan1992']
    );

    if (existingUser.rows.length > 0) {
      console.log('用户 Ethan1992 已存在');

      // 更新密码
      const hashedPassword = await bcrypt.hash('Ethan1992', 10);
      await client.query(
        'UPDATE users SET password = $1 WHERE username = $2',
        [hashedPassword, 'Ethan1992']
      );
      console.log('已更新用户密码为 Ethan1992');
      return;
    }
    
    // 创建用户
    const hashedPassword = await bcrypt.hash('Ethan1992', 10);
    await client.query(
      'INSERT INTO users (username, password) VALUES ($1, $2)',
      ['Ethan1992', hashedPassword]
    );
    
    console.log('✓ 用户创建成功!');
    console.log('  用户名: Ethan1992');
    console.log('  密码: Ethan1992');
    
  } catch (error) {
    console.error('创建测试用户失败:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createTestUser();
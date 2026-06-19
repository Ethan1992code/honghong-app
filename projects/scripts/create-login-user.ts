import { Pool } from 'pg';
import { config } from 'dotenv';
import bcrypt from 'bcrypt';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createUser() {
  const username = 'test';
  const password = 'test123';
  
  try {
    // Check if user exists
    const existing = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    
    if (existing.rows.length > 0) {
      console.log('User "test" already exists!');
    } else {
      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        'INSERT INTO users (username, password) VALUES ($1, $2)',
        [username, hash]
      );
      console.log('Created user: test / test123');
    }
    
    console.log('\nNow you can login with:');
    console.log('  Username: test');
    console.log('  Password: test123');
    console.log('\nGo to http://localhost:3000/login\n');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

createUser();

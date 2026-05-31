import { Pool } from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkScenarios() {
  const result = await pool.query('SELECT id, title FROM scenarios ORDER BY id');
  console.log('当前场景列表:');
  result.rows.forEach((row: any) => {
    console.log('ID:', row.id, '标题:', row.title);
  });
  await pool.end();
}

checkScenarios().catch(console.error);

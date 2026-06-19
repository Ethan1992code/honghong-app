import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { config } from 'dotenv';
import path from 'path';
import bcrypt from 'bcrypt';
import * as schema from '../src/storage/database/shared/schema';

async function testRegistration() {
  // 加载环境变量
  const envPath = path.resolve(process.cwd(), '.env.local');
  const result = config({ path: envPath });
  
  if (result.error) {
    console.error('Error loading .env.local:', result.error);
    return;
  }
  
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
    console.log('Testing user registration flow...\n');
    
    // 1. 检查现有用户
    console.log('1. Checking existing users...');
    const existingUsers = await db.select().from(schema.users);
    console.log(`   Found ${existingUsers.length} users in database`);
    
    if (existingUsers.length === 0) {
      console.log('\n   ⚠️  No users found in database!');
      console.log('   You need to register first before you can login.\n');
    } else {
      console.log('   Sample users:');
      existingUsers.slice(0, 3).forEach(user => {
        console.log(`   - Username: ${user.username}, ID: ${user.id}`);
      });
    }
    
    // 2. 测试注册流程
    console.log('\n2. Testing registration flow...');
    const testUsername = `test_${Date.now()}`;
    const testPassword = 'test123456';
    
    try {
      // 哈希密码
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      console.log(`   Creating test user: ${testUsername}`);
      
      // 插入用户
      const newUser = await db.insert(schema.users).values({
        username: testUsername,
        password: hashedPassword,
      }).returning();
      
      console.log(`   ✅ User created successfully! ID: ${newUser[0]?.id || 'unknown'}`);
      
      // 3. 测试登录流程
      console.log('\n3. Testing login flow...');
      
      // 查找用户
      const foundUsers = await db.select().from(schema.users).where(
        schema.users.username.equals(testUsername)
      );
      
      if (foundUsers.length === 0) {
        console.log('   ❌ User not found after creation!');
      } else {
        const user = foundUsers[0];
        console.log(`   Found user: ${user.username}`);
        console.log(`   Password hash: ${user.password.substring(0, 20)}...`);
        
        // 验证密码
        const isValid = await bcrypt.compare(testPassword, user.password);
        console.log(`   Password validation: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
        
        if (isValid) {
          console.log('\n✅ Registration and login flow working correctly!');
        } else {
          console.log('\n❌ Password validation failed!');
        }
      }
      
      // 清理测试用户
      console.log('\n4. Cleaning up test user...');
      await db.delete(schema.users).where(
        schema.users.username.equals(testUsername)
      );
      console.log('   ✅ Test user deleted');
      
    } catch (error) {
      console.error('   ❌ Registration failed:', error);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testRegistration();

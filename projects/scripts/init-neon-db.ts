import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });
config({ path: join(__dirname, '..', '.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

// 创建表结构
async function initNeonDB() {
  const client = await pool.connect();
  
  try {
    console.log('开始初始化 Neon 数据库...');
    
    // 创建枚举类型
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE category AS ENUM ('girlfriend', 'boyfriend');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE status AS ENUM ('in_progress', 'success', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE role AS ENUM ('user', 'assistant');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    console.log('✓ 枚举类型创建完成');
    
    // 创建场景表
    await client.query(`
      CREATE TABLE IF NOT EXISTS scenarios (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        emotion_level INTEGER DEFAULT 3,
        stage_config JSONB,
        category category DEFAULT 'girlfriend',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ 场景表创建完成');
    
    // 创建用户表
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ 用户表创建完成');
    
    // 创建会话表
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        scenario_id INTEGER REFERENCES scenarios(id),
        user_id INTEGER REFERENCES users(id),
        current_stage INTEGER DEFAULT 1,
        status status DEFAULT 'in_progress',
        rounds_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ 会话表创建完成');
    
    // 创建会话消息表
    await client.query(`
      CREATE TABLE IF NOT EXISTS session_messages (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES sessions(id),
        role role NOT NULL,
        content TEXT NOT NULL,
        stage INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ 会话消息表创建完成');
    
    // 创建进度记录表
    await client.query(`
      CREATE TABLE IF NOT EXISTS progress_records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        scenario_id INTEGER REFERENCES scenarios(id),
        total_attempts INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ 进度记录表创建完成');
    
    // 检查并插入示例场景
    const existingScenarios = await client.query('SELECT COUNT(*) as count FROM scenarios');
    if (parseInt(existingScenarios.rows[0].count) === 0) {
      console.log('插入示例场景...');
      
      const scenarios = [
        {
          title: '忘记了重要的日子',
          description: '你因为工作忙碌，忘记了和女朋友重要的纪念日，现在她非常生气',
          emotion_level: 5,
          stage_config: JSON.stringify({
            "1": {"name": "生气", "description": "她正在气头上，需要你诚恳道歉", "ai_persona": "非常生气，说话带刺，不轻易原谅", "success_condition": "你要先承认错误，表现出真正的歉意", "min_rounds": 2},
            "2": {"name": "缓和", "description": "她开始有点动摇了，继续保持耐心", "ai_persona": "语气稍微缓和，但还是有点生气", "success_condition": "你要具体说明会怎么弥补", "min_rounds": 2},
            "3": {"name": "心软", "description": "她开始理解你了，再加把劲", "ai_persona": "语气温柔了一些，愿意给你机会", "success_condition": "你要表示对她的重视", "min_rounds": 2},
            "4": {"name": "原谅", "description": "她原谅你了！", "ai_persona": "完全原谅你，恢复温柔", "success_condition": "你要给她一个甜蜜的承诺", "min_rounds": 1}
          }),
          category: 'girlfriend'
        },
        {
          title: '约会迟到',
          description: '你约会时迟到了1个小时，女朋友等得不耐烦了',
          emotion_level: 4,
          stage_config: JSON.stringify({
            "1": {"name": "生气", "description": "她等了很久，需要你诚恳道歉", "ai_persona": "非常生气，质问你为什么迟到", "success_condition": "承认错误，解释原因", "min_rounds": 2},
            "2": {"name": "缓和", "description": "她开始听你解释了", "ai_persona": "语气稍微缓和", "success_condition": "表达对她的重视", "min_rounds": 2},
            "3": {"name": "心软", "description": "她开始理解你了", "ai_persona": "愿意给你机会", "success_condition": "提出弥补方案", "min_rounds": 2},
            "4": {"name": "原谅", "description": "她原谅你了！", "ai_persona": "恢复温柔", "success_condition": "给出甜蜜承诺", "min_rounds": 1}
          }),
          category: 'girlfriend'
        },
        {
          title: '节日礼物不合心意',
          description: '你送的节日礼物她不太喜欢，现在她有点失望',
          emotion_level: 3,
          stage_config: JSON.stringify({
            "1": {"name": "失望", "description": "她收到礼物不太满意", "ai_persona": "有点失望，说话冷淡", "success_condition": "表达你用心挑选的心意", "min_rounds": 2},
            "2": {"name": "解释", "description": "她想知道你为什么选这个礼物", "ai_persona": "想了解你的想法", "success_condition": "说明你选礼物的用心", "min_rounds": 2},
            "3": {"name": "理解", "description": "她开始理解你的心意", "ai_persona": "语气缓和", "success_condition": "提出换礼物或补偿", "min_rounds": 2},
            "4": {"name": "开心", "description": "她原谅你了！", "ai_persona": "恢复开心", "success_condition": "给她一个拥抱", "min_rounds": 1}
          }),
          category: 'girlfriend'
        },
        {
          title: '朋友圈忘记点赞',
          description: '你忘记给女朋友的朋友圈点赞，她觉得你不在乎她',
          emotion_level: 2,
          stage_config: JSON.stringify({
            "1": {"name": "不满", "description": "她发现你没点赞，有点不满", "ai_persona": "有点小生气，质问你", "success_condition": "承认疏忽，道歉", "min_rounds": 2},
            "2": {"name": "解释", "description": "她想听你解释", "ai_persona": "等待你的解释", "success_condition": "说明你最近比较忙", "min_rounds": 2},
            "3": {"name": "撒娇", "description": "她开始撒娇", "ai_persona": "有点小任性", "success_condition": "哄她开心", "min_rounds": 2},
            "4": {"name": "原谅", "description": "她原谅你了！", "ai_persona": "恢复开心", "success_condition": "保证以后一定点赞", "min_rounds": 1}
          }),
          category: 'girlfriend'
        },
        {
          title: '打游戏忽略她',
          description: '你只顾着打游戏忽略了女朋友，她觉得被冷落了',
          emotion_level: 4,
          stage_config: JSON.stringify({
            "1": {"name": "生气", "description": "她觉得被忽略了", "ai_persona": "非常生气，直接表达不满", "success_condition": "暂停游戏，关注她", "min_rounds": 2},
            "2": {"name": "委屈", "description": "她开始委屈", "ai_persona": "有点难过", "success_condition": "表达歉意，说明以后会注意", "min_rounds": 2},
            "3": {"name": "心软", "description": "她开始心软", "ai_persona": "有点动摇", "success_condition": "给她一些陪伴时间", "min_rounds": 2},
            "4": {"name": "原谅", "description": "她原谅你了！", "ai_persona": "恢复温柔", "success_condition": "约定以后的游戏时间", "min_rounds": 1}
          }),
          category: 'girlfriend'
        }
      ];
      
      for (const scenario of scenarios) {
        await client.query(
          'INSERT INTO scenarios (title, description, emotion_level, stage_config, category) VALUES ($1, $2, $3, $4, $5)',
          [scenario.title, scenario.description, scenario.emotion_level, scenario.stage_config, scenario.category]
        );
        console.log(`✓ 添加场景: ${scenario.title}`);
      }
    } else {
      console.log('场景数据已存在，跳过插入');
    }
    
    console.log('\n✅ Neon 数据库初始化完成！');
  } catch (error) {
    console.error('初始化失败:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

initNeonDB().catch(console.error);

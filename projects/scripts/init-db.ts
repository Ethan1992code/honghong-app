import { Pool } from 'pg';
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

const createTablesSQL = `
-- Enable uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);

-- Create scenarios table
CREATE TABLE IF NOT EXISTS scenarios (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  emotion_level INTEGER DEFAULT 3 NOT NULL,
  stage_config JSONB NOT NULL,
  category VARCHAR(20) DEFAULT 'girlfriend' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS scenarios_title_idx ON scenarios(title);
CREATE INDEX IF NOT EXISTS scenarios_category_idx ON scenarios(category);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(36) DEFAULT uuid_generate_v4() PRIMARY KEY,
  scenario_id INTEGER NOT NULL,
  user_id VARCHAR(36) DEFAULT uuid_generate_v4() NOT NULL,
  current_stage INTEGER DEFAULT 1 NOT NULL,
  status VARCHAR(20) DEFAULT 'in_progress' NOT NULL,
  rounds_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  FOREIGN KEY (scenario_id) REFERENCES scenarios(id)
);

CREATE INDEX IF NOT EXISTS sessions_scenario_id_idx ON sessions(scenario_id);
CREATE INDEX IF NOT EXISTS sessions_status_idx ON sessions(status);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);

-- Create session_messages table
CREATE TABLE IF NOT EXISTS session_messages (
  id VARCHAR(36) DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  role VARCHAR(10) NOT NULL,
  content TEXT NOT NULL,
  stage INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS session_messages_session_id_idx ON session_messages(session_id);

-- Create progress_records table
CREATE TABLE IF NOT EXISTS progress_records (
  id VARCHAR(36) DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  scenario_id INTEGER NOT NULL,
  total_attempts INTEGER DEFAULT 0 NOT NULL,
  success_count INTEGER DEFAULT 0 NOT NULL,
  best_rounds INTEGER,
  last_rounds INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  FOREIGN KEY (scenario_id) REFERENCES scenarios(id)
);

CREATE INDEX IF NOT EXISTS progress_records_scenario_id_idx ON progress_records(scenario_id);
CREATE INDEX IF NOT EXISTS progress_records_user_id_idx ON progress_records(user_id);

-- Create health_check table
CREATE TABLE IF NOT EXISTS health_check (
  id SERIAL NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`;

const seedScenariosSQL = `
-- Insert example scenarios
INSERT INTO scenarios (title, description, emotion_level, stage_config, category)
VALUES
('忘记了重要的日子', '你因为工作忙碌，忘记了和女朋友重要的纪念日，现在她非常生气', 5,
  '{
    "1": {"name": "生气", "description": "她正在气头上，需要你诚恳道歉", "ai_persona": "非常生气，说话带刺，不轻易原谅", "success_condition": "你要先承认错误，表现出真正的歉意", "min_rounds": 2},
    "2": {"name": "缓和", "description": "她开始有点动摇了，继续保持耐心", "ai_persona": "语气稍微缓和，但还是有点生气", "success_condition": "你要具体说明会怎么弥补", "min_rounds": 2},
    "3": {"name": "心软", "description": "她开始理解你了，再加把劲", "ai_persona": "语气温柔了一些，愿意给你机会", "success_condition": "你要表示对她的重视", "min_rounds": 2},
    "4": {"name": "原谅", "description": "她原谅你了！", "ai_persona": "完全原谅你，恢复温柔", "success_condition": "你要给她一个甜蜜的承诺", "min_rounds": 1}
  }', 'girlfriend'),
('约会迟到', '你约会时迟到了1个小时，女朋友等得不耐烦了', 4,
  '{
    "1": {"name": "生气", "description": "她等了很久，需要你诚恳道歉", "ai_persona": "非常生气，质问你为什么迟到", "success_condition": "承认错误，解释原因", "min_rounds": 2},
    "2": {"name": "缓和", "description": "她开始听你解释了", "ai_persona": "语气稍微缓和", "success_condition": "表达对她的重视", "min_rounds": 2},
    "3": {"name": "心软", "description": "她开始理解你了", "ai_persona": "愿意给你机会", "success_condition": "提出弥补方案", "min_rounds": 2},
    "4": {"name": "原谅", "description": "她原谅你了！", "ai_persona": "恢复温柔", "success_condition": "给出甜蜜承诺", "min_rounds": 1}
  }', 'girlfriend'),
('节日礼物不合心意', '你送的节日礼物她不太喜欢，现在她有点失望', 3,
  '{
    "1": {"name": "失望", "description": "她收到礼物不太满意", "ai_persona": "有点失望，说话冷淡", "success_condition": "表达你用心挑选的心意", "min_rounds": 2},
    "2": {"name": "解释", "description": "她想知道你为什么选这个礼物", "ai_persona": "想了解你的想法", "success_condition": "说明你选礼物的用心", "min_rounds": 2},
    "3": {"name": "理解", "description": "她开始理解你的心意", "ai_persona": "语气缓和", "success_condition": "提出换礼物或补偿", "min_rounds": 2},
    "4": {"name": "开心", "description": "她原谅你了！", "ai_persona": "恢复开心", "success_condition": "给她一个拥抱", "min_rounds": 1}
  }', 'girlfriend'),
('朋友圈忘记点赞', '你忘记给女朋友的朋友圈点赞，她觉得你不在乎她', 2,
  '{
    "1": {"name": "不满", "description": "她发现你没点赞，有点不满", "ai_persona": "有点小生气，质问你", "success_condition": "承认疏忽，道歉", "min_rounds": 2},
    "2": {"name": "解释", "description": "她想听你解释", "ai_persona": "等待你的解释", "success_condition": "说明你最近比较忙", "min_rounds": 2},
    "3": {"name": "撒娇", "description": "她开始撒娇", "ai_persona": "有点小任性", "success_condition": "哄她开心", "min_rounds": 2},
    "4": {"name": "原谅", "description": "她原谅你了！", "ai_persona": "恢复开心", "success_condition": "保证以后一定点赞", "min_rounds": 1}
  }', 'girlfriend'),
('打游戏忽略她', '你只顾着打游戏忽略了女朋友，她觉得被冷落了', 4,
  '{
    "1": {"name": "生气", "description": "她觉得被忽略了", "ai_persona": "非常生气，直接表达不满", "success_condition": "暂停游戏，关注她", "min_rounds": 2},
    "2": {"name": "委屈", "description": "她开始委屈", "ai_persona": "有点难过", "success_condition": "表达歉意，说明以后会注意", "min_rounds": 2},
    "3": {"name": "心软", "description": "她开始心软", "ai_persona": "有点动摇", "success_condition": "给她一些陪伴时间", "min_rounds": 2},
    "4": {"name": "原谅", "description": "她原谅你了！", "ai_persona": "恢复温柔", "success_condition": "约定以后的游戏时间", "min_rounds": 1}
  }', 'girlfriend')
ON CONFLICT DO NOTHING;
`;

async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log('开始创建数据库表...');
    await client.query(createTablesSQL);
    console.log('数据库表创建完成！');

    console.log('开始插入示例数据...');
    await client.query(seedScenariosSQL);
    console.log('示例数据插入完成！');

    console.log('数据库初始化成功！');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase().catch(console.error);

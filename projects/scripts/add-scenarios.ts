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

const newScenariosSQL = `
INSERT INTO scenarios (title, description, emotion_level, stage_config, category)
VALUES
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
ON CONFLICT (title) DO NOTHING;
`;

async function addScenarios() {
  const client = await pool.connect();
  try {
    console.log('开始添加新场景...');
    const result = await client.query(newScenariosSQL);
    console.log(`成功添加了 ${result.rowCount} 条场景！`);
  } catch (error) {
    console.error('添加场景失败:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addScenarios().catch(console.error);

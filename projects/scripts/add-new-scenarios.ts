import { Pool } from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 新场景数据（使用独特的标题）
const newScenarios = [
  {
    title: '忘记回复消息',
    description: '你忘记回复女朋友的消息，她觉得被忽略了',
    emotion_level: 3,
    stage_config: JSON.stringify({
      "1": {"name": "不满", "description": "她发现你没回复消息", "ai_persona": "有点生气，觉得被忽略", "success_condition": "承认错误，道歉", "min_rounds": 2},
      "2": {"name": "解释", "description": "她想听你解释原因", "ai_persona": "等待你的解释", "success_condition": "说明你为什么没回复", "min_rounds": 2},
      "3": {"name": "撒娇", "description": "她开始撒娇", "ai_persona": "有点小任性", "success_condition": "哄她开心", "min_rounds": 2},
      "4": {"name": "原谅", "description": "她原谅你了！", "ai_persona": "恢复温柔", "success_condition": "保证以后及时回复", "min_rounds": 1}
    }),
    category: 'girlfriend'
  },
  {
    title: '节日没有惊喜',
    description: '节日到了，但你没有准备惊喜，她有点失落',
    emotion_level: 2,
    stage_config: JSON.stringify({
      "1": {"name": "失落", "description": "她期待惊喜但没有", "ai_persona": "有点失望", "success_condition": "表达你的心意", "min_rounds": 2},
      "2": {"name": "理解", "description": "她开始理解你", "ai_persona": "语气缓和", "success_condition": "说明你其实很在乎她", "min_rounds": 2},
      "3": {"name": "期待", "description": "她期待弥补", "ai_persona": "有点期待", "success_condition": "提出弥补方案", "min_rounds": 2},
      "4": {"name": "开心", "description": "她开心了！", "ai_persona": "恢复开心", "success_condition": "给她一个拥抱", "min_rounds": 1}
    }),
    category: 'girlfriend'
  },
  {
    title: '和朋友聚会忽略她',
    description: '你和朋友聚会时忽略了女朋友，她觉得被冷落',
    emotion_level: 3,
    stage_config: JSON.stringify({
      "1": {"name": "生气", "description": "她觉得被忽略了", "ai_persona": "有点生气", "success_condition": "注意到她的情绪", "min_rounds": 2},
      "2": {"name": "委屈", "description": "她开始委屈", "ai_persona": "有点难过", "success_condition": "表达歉意", "min_rounds": 2},
      "3": {"name": "心软", "description": "她开始心软", "ai_persona": "有点动摇", "success_condition": "表示以后会注意", "min_rounds": 2},
      "4": {"name": "原谅", "description": "她原谅你了！", "ai_persona": "恢复温柔", "success_condition": "约定以后的相处时间", "min_rounds": 1}
    }),
    category: 'girlfriend'
  }
];

async function addScenarios() {
  const client = await pool.connect();
  try {
    console.log('开始添加新场景...');
    
    // 先重置序列到高于现有最大ID的值
    await client.query("SELECT setval('scenarios_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM scenarios))");
    
    // 获取已存在的场景标题（解码后）
    const existingResult = await client.query('SELECT title FROM scenarios');
    const existingTitles = new Set(existingResult.rows.map((row: any) => row.title));
    
    let addedCount = 0;
    
    for (const scenario of newScenarios) {
      // 检查标题是否已存在
      const exists = await client.query(
        "SELECT COUNT(*) as count FROM scenarios WHERE title = $1",
        [scenario.title]
      );
      
      if (exists.rows[0].count === '0') {
        await client.query(
          'INSERT INTO scenarios (title, description, emotion_level, stage_config, category) VALUES ($1, $2, $3, $4, $5)',
          [scenario.title, scenario.description, scenario.emotion_level, scenario.stage_config, scenario.category]
        );
        console.log(`✓ 添加场景: ${scenario.title}`);
        addedCount++;
      } else {
        console.log(`✗ 场景已存在，跳过: ${scenario.title}`);
      }
    }
    
    console.log(`\n完成！共添加了 ${addedCount} 条新场景`);
  } catch (error) {
    console.error('添加场景失败:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addScenarios().catch(console.error);

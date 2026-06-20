import { NextRequest, NextResponse } from "next/server";
import { db } from "@/storage/database/drizzle-client";
import { scenarios } from "@/storage/database/shared/schema";
import { normalizeScenario } from "@/lib/scenarios";
import { eq, asc } from "drizzle-orm";

const defaultScenarios = [
  {
    id: 1,
    title: "忘记纪念日",
    description: "你忘记了今天是恋爱纪念日，她期待了一整天",
    emotionLevel: 5,
    category: "girlfriend",
    stageConfig: [
      { description: "她一整天情绪低落，话少，回复很冷淡", hint: "察觉到异常，主动问她怎么了" },
      { description: "她终于忍不住提了纪念日的事，声音委屈", hint: "立刻道歉，态度要诚恳" },
      { description: "她听你道歉后语气缓和了，但还在说你不在意", hint: "表达重视，回忆美好瞬间" },
      { description: "她基本消气了，在等你一个惊喜", hint: "提出补救方案，用行动证明" },
    ],
  },
  {
    id: 2,
    title: "约会迟到",
    description: "你们约好一起吃饭，你迟到了半小时，她已经等了很久",
    emotionLevel: 4,
    category: "girlfriend",
    stageConfig: [
      { description: "她黑着脸坐在那里，看到你第一句话就是'你还知道来'", hint: "先道歉，别找借口" },
      { description: "她开始翻旧账'你上次也是这样'", hint: "承认错误，别反驳" },
      { description: "她语气缓和了，但还在念叨", hint: "共情她的感受" },
      { description: "她基本消气了，在等你台阶", hint: "撒娇求原谅，给个小奖励" },
    ],
  },
  {
    id: 3,
    title: "打游戏被队友坑",
    description: "他开黑打游戏被队友坑到破防，情绪爆炸，你正好找他聊天撞枪口上了",
    emotionLevel: 4,
    category: "boyfriend",
    stageConfig: [
      { description: "他刚打完一局，血压飙升，对你发来的消息爱答不理", hint: "先让他发泄完，顺着他的情绪走" },
      { description: "他稍微平静了一点，愿意多打几个字了", hint: "陪他一起吐槽队友" },
      { description: "他语气明显软了，开始跟你聊起别的事", hint: "顺着话题聊点轻松的" },
      { description: "他基本消气了，还可能自嘲刚才太激动", hint: "给一个台阶下，夸他操作帅" },
    ],
  },
  {
    id: 4,
    title: "忘记恋爱纪念日",
    description: "你完全忘了今天是恋爱纪念日，他期待了一整天",
    emotionLevel: 5,
    category: "boyfriend",
    stageConfig: [
      { description: "他一整天情绪低落，话少，回复变得很冷淡", hint: "察觉到他的异常，主动问他怎么了" },
      { description: "他终于忍不住提了纪念日的事，声音委屈", hint: "立刻道歉，态度要诚恳" },
      { description: "他听你道歉后语气缓和了，但还在说你不在意", hint: "表达重视，回忆美好瞬间" },
      { description: "他基本消气了，在等你一个惊喜", hint: "提出补救方案，用行动证明" },
    ],
  },
];

export async function GET(request: NextRequest) {
  if (!db) {
    console.warn('[Scenarios] Database not available, returning default scenarios');
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    
    if (category) {
      return NextResponse.json({
        scenarios: defaultScenarios
          .filter(s => s.category === category)
          .map(normalizeScenario),
      });
    }
    return NextResponse.json({ scenarios: defaultScenarios.map(normalizeScenario) });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  let data;
  
  try {
    if (category) {
      data = await db
        .select({
          id: scenarios.id,
          title: scenarios.title,
          description: scenarios.description,
          emotionLevel: scenarios.emotionLevel,
          stageConfig: scenarios.stageConfig,
          category: scenarios.category,
        })
        .from(scenarios)
        .where(eq(scenarios.category, category))
        .orderBy(asc(scenarios.id))
        .execute();
    } else {
      data = await db
        .select({
          id: scenarios.id,
          title: scenarios.title,
          description: scenarios.description,
          emotionLevel: scenarios.emotionLevel,
          stageConfig: scenarios.stageConfig,
          category: scenarios.category,
        })
        .from(scenarios)
        .orderBy(asc(scenarios.id))
        .execute();
    }
  } catch (error) {
    console.error('[Scenarios] Database query failed:', error);
    return NextResponse.json({ scenarios: defaultScenarios.map(normalizeScenario) });
  }

  return NextResponse.json({ scenarios: data.map(normalizeScenario) });
}

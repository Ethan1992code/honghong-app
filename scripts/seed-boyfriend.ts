import "dotenv/config";
import { db } from "../src/storage/database/drizzle-client";
import { scenarios } from "../src/storage/database/shared/schema";

const boyfriendScenarios = [
  {
    title: "打游戏被队友坑",
    description: "他开黑打游戏被队友坑到破防，情绪爆炸，你正好找他聊天撞枪口上了",
    emotionLevel: 4,
    category: "boyfriend" as const,
    stageConfig: [
      {
        description: "他刚打完一局，血压飙升，对你发来的消息爱答不理，语气冲",
        hint: "先让他发泄完，别急着讲道理或安慰，顺着他的情绪走",
      },
      {
        description: "他稍微平静了一点，愿意多打几个字了，但还在抱怨队友",
        hint: "陪他一起吐槽队友，表现出你站他这边，别教他怎么玩游戏",
      },
      {
        description: "他语气明显软了，开始跟你聊起别的事，情绪在好转",
        hint: "顺着话题聊点轻松的，顺便撒个娇让他心情更好",
      },
      {
        description: "他基本消气了，还可能自嘲刚才太激动了",
        hint: "给一个台阶下，比如夸他就算被坑操作也很帅，或者说'我就喜欢你认真玩游戏的样子'",
      },
    ],
  },
  {
    title: "忘记恋爱纪念日",
    description: "你完全忘了今天是恋爱纪念日，他期待了一整天，结果你一点反应都没有",
    emotionLevel: 5,
    category: "boyfriend" as const,
    stageConfig: [
      {
        description: "他一整天情绪低落，话少，回复变得很冷淡，但你还没意识到发生了什么",
        hint: "察觉到他的异常，主动问他怎么了，别装没事",
      },
      {
        description: "他终于忍不住提了一句'今天是什么日子你不知道吗'，声音里带着委屈",
        hint: "立刻道歉+承认错误，态度要诚恳，不要找借口（比如工作忙）",
      },
      {
        description: "他听你道歉后语气缓和了，但还在说'你是不是根本不在意这段感情'",
        hint: "表达重视+回忆美好瞬间+承诺以后一定记住",
      },
      {
        description: "他嘴上说着'算了算了'，但明显在等你一个惊喜或暖心举动",
        hint: "提出补救方案，比如'今晚我请你吃大餐/看电影/送你礼物'，用行动证明",
      },
    ],
  },
  {
    title: "乱花钱被他说",
    description: "你双十一买了十几件东西，他看到你信用卡账单后沉默了",
    emotionLevel: 3,
    category: "boyfriend" as const,
    stageConfig: [
      {
        description: "他皱着眉问你'这些东西你都用得上吗'，语气里带着不理解",
        hint: "别直接怼回去，先承认有些确实冲动了，表现出反思的态度",
      },
      {
        description: "他开始认真跟你聊理财观念，'我不是不让你买，是觉得要规划一下'",
        hint: "表示理解他的出发点，认可他是为两个人好，而不是控制你",
      },
      {
        description: "他态度软了，说'算了你开心就好'，但明显还在意",
        hint: "主动提出一起制定预算计划，让他觉得你是认真对待这件事的",
      },
      {
        description: "他消气了，还可能自嘲'我是不是管太多了'",
        hint: "给他一个台阶+小撒娇，比如'你是管家公嘛，我乐意被你管'",
      },
    ],
  },
  {
    title: "应酬太晚回家",
    description: "你答应他早点回家，结果应酬到凌晨一点才回，手机还没电了",
    emotionLevel: 4,
    category: "boyfriend" as const,
    stageConfig: [
      {
        description: "他黑着脸坐在沙发上等你，看到你第一句话就是'你还知道回来'",
        hint: "先道歉+解释原因（简短），别找借口说'工作忙没办法'",
      },
      {
        description: "他翻旧账'你上次也是这么说的'，情绪还是很激动，担心你的安全",
        hint: "承认这是老毛病+表达理解他的担心，让他知道你懂他的焦虑",
      },
      {
        description: "他语气缓和了，但还在念叨'手机没电我多担心你知道吗'",
        hint: "共情他的感受+承诺以后带充电宝/到了报平安/设置紧急联系人",
      },
      {
        description: "他基本消气了，可能还在嘴硬'下次再这样就不管你了'",
        hint: "撒娇求原谅+小奖励（比如'以后我早回家给你做夜宵/陪你打游戏'）",
      },
    ],
  },
];

async function seed() {
  console.log("开始插入 boyfriend 场景...");

  for (const s of boyfriendScenarios) {
    await db.insert(scenarios).values({
      title: s.title,
      description: s.description,
      emotionLevel: s.emotionLevel,
      stageConfig: s.stageConfig,
      category: s.category,
    });
    console.log(`已插入场景: ${s.title}`);
  }

  console.log("插入完成！");
  process.exit(0);
}

seed().catch((err) => {
  console.error("插入失败:", err);
  process.exit(1);
});

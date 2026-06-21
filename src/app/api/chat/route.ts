import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getSession } from "@/lib/session";
import { getRequestOrigin } from "@/lib/request-origin";
import { findScenarioById } from "@/lib/scenarios";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ScenarioSummary {
  id: number | string;
  title: string;
  description: string;
  category: string;
  stage_config?: unknown[];
  stageConfig?: unknown[];
  [key: string]: unknown;
}

interface GuestHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

interface GuestSessionState {
  current_stage?: number;
  emotion_score?: number;
  rounds_count?: number;
  history?: GuestHistoryMessage[];
}

interface ChatModelResult {
  response: string;
  emotion: string;
  stage_changed: boolean;
  score_delta: number;
  reference_answer: string | null;
  suggestions: string[];
}

const STAGE_SCORE_THRESHOLDS = [0, 35, 65, 90];

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

function scoreToStage(score: number) {
  if (score >= STAGE_SCORE_THRESHOLDS[3]) return 4;
  if (score >= STAGE_SCORE_THRESHOLDS[2]) return 3;
  if (score >= STAGE_SCORE_THRESHOLDS[1]) return 2;
  return 1;
}

function scoreForStage(stage: number) {
  return STAGE_SCORE_THRESHOLDS[Math.max(0, Math.min(3, stage - 1))];
}

function createFallbackChatResponse(reason: string, currentStage: number = 1): string {
  console.warn(`[Chat] Falling back to local response: ${reason}`);

  const fallbackReplies: Record<number, string[]> = {
    1: [
      "你现在说对不起，我听见了。但我难过的不是这三个字，是你刚才真的没把我的感受放在心上。",
      "我不是想故意为难你，只是刚才那一下真的挺委屈的。你要哄我，也得让我感觉你是真的懂了。",
      "你别只想着赶紧翻篇。我现在还在气头上，但如果你愿意好好说，我可以再听你解释一句。",
    ],
    2: [
      "你这么说，我心里是松了一点。但我还是会想，你下次会不会又觉得这只是小事。",
      "好吧，我承认你这句话比刚才认真多了。可我还没完全消气，你得再拿出点诚意来。",
      "我不是不讲理的人，只是想确认你真的在乎我。你继续说，我听着。",
    ],
    3: [
      "其实听你这么说，我已经有点心软了。只是我还想看到你真的知道我在难过什么。",
      "哼，你现在倒是会说话了。再认真一点点，我可能就真的不舍得生你气了。",
      "我心里没刚才那么堵了。你别又敷衍我，把你以后准备怎么做说清楚。",
    ],
    4: [
      "好啦，我其实已经没那么气了。你刚才那样认真哄我，我还是能感觉到你在乎我的。",
      "算你过关吧。下次别等我真的难过了才开始紧张，我也是会委屈的。",
      "我原谅你了，但你要记住今天这件事。不是怕你犯错，是怕你不把我的感受当回事。",
    ],
  };

  const replies = fallbackReplies[currentStage] ?? fallbackReplies[1];
  const response = replies[Math.floor(Math.random() * replies.length)];

  return JSON.stringify({
    response,
    emotion: STAGES[currentStage - 1]?.name ?? "生气",
    stage_changed: false,
    score_delta: 5,
    reference_answer:
      "可以说：对不起，是我忽略了你的感受。你对我很重要，我会用行动补回来。",
    suggestions: ["那你别气了呗", "我先忙一会儿", "这也不算大事吧"],
  });
}

async function callDeepSeek(
  messages: LLMMessage[],
  temperature: number = 0.8,
  currentStage: number = 1
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return createFallbackChatResponse("missing DEEPSEEK_API_KEY", currentStage);
  }

  try {
    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: 700,
        response_format: { type: "json_object" },
        thinking: { type: "disabled" },
        temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return createFallbackChatResponse(
        `upstream ${response.status}: ${errorText.slice(0, 200)}`,
        currentStage
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    return content || createFallbackChatResponse("empty upstream response", currentStage);
  } catch (error) {
    return createFallbackChatResponse(
      error instanceof Error ? error.message : "unknown upstream error",
      currentStage
    );
  }
}

const STAGES = [
  { id: 1, name: "生气" },
  { id: 2, name: "缓和" },
  { id: 3, name: "心软" },
  { id: 4, name: "原谅" },
];

async function loadScenarioFromApi(
  request: NextRequest,
  scenarioId: number | string
): Promise<ScenarioSummary | null> {
  const res = await fetch(`${getRequestOrigin(request)}/api/scenarios`);
  if (!res.ok) {
    throw new Error(`Scenario API error: ${res.status}`);
  }

  const scenariosData = (await res.json()) as { scenarios?: ScenarioSummary[] };
  return findScenarioById(scenariosData.scenarios ?? [], scenarioId) ?? null;
}

function parseChatModelResult(rawResponse: string): ChatModelResult {
  const cleanResponse = rawResponse.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  try {
    const parsed = JSON.parse(cleanResponse) as Partial<ChatModelResult>;
    if (!parsed.response || typeof parsed.response !== "string") {
      throw new Error("缺少 response 字段");
    }

    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter((item): item is string => typeof item === "string").slice(0, 3)
      : [];

    const rawScoreDelta = typeof parsed.score_delta === "number" ? parsed.score_delta : 0;

    return {
      response: parsed.response,
      emotion: typeof parsed.emotion === "string" ? parsed.emotion : "生气",
      stage_changed: parsed.stage_changed === true,
      score_delta: Math.max(-20, Math.min(30, Math.round(rawScoreDelta))),
      reference_answer:
        typeof parsed.reference_answer === "string" ? parsed.reference_answer : null,
      suggestions,
    };
  } catch {
    return {
      response: cleanResponse,
      emotion: "生气",
      stage_changed: false,
      score_delta: 0,
      reference_answer: null,
      suggestions: [],
    };
  }
}

function resolveChatProgress(
  currentStage: number,
  currentScore: number,
  result: ChatModelResult
) {
  const adjustedDelta = result.stage_changed && result.score_delta < 12
    ? 12
    : result.score_delta;
  const nextScore = clampScore(currentScore + adjustedDelta);
  const scoreStage = scoreToStage(nextScore);
  const nextStage = Math.max(currentStage, scoreStage);

  return {
    emotionScore: nextScore,
    newStage: nextStage,
    stageChanged: nextStage > currentStage,
  };
}

function buildSystemPrompt(scenario: any, currentStage: number) {
  const isGirlfriend = scenario.category === "girlfriend";
  const role = isGirlfriend ? "女朋友" : "男朋友";
  const partner = isGirlfriend ? "男朋友" : "女朋友";
  const stageInfo = STAGES.find((s) => s.id === currentStage) || STAGES[0];
  const stageConfig = scenario.stage_config?.[currentStage - 1] || scenario.stageConfig?.[currentStage - 1] || {};

  return `你是一个真实的${role}，正在因为某件事生${partner}的气。你的任务是模拟${role}在不同生气阶段的真实反应。

## 核心规则
1. 全程用中文，语气要真实自然，像一个真实的${role}
2. 回复要像微信聊天，不要只回一句模板话；每次 2-4 句，约 70-180 个中文字符
3. 根据当前阶段表现出不同的情绪状态
4. 禁止角色扮演以外的回答，不要跳出"${role}"的身份
5. 不要主动提示"参考回答"或"正确答案"
6. 必须回应用户上一句话里的具体内容，避免每轮重复同一种语气或句式
7. 可以有停顿、反问、小情绪和口语化表达，但不要讲大道理

## 各阶段情绪特征
- 阶段1(生气)：冷淡、委屈、带刺，但仍要具体回应用户的话，不能只说"嗯""哦"
- 阶段2(缓和)：态度松动，愿意多聊几句，但仍带小情绪
- 阶段3(心软)：语气温柔了，带点撒娇，愿意给机会
- 阶段4(原谅)：基本消气了，会表达被哄好的感觉，但不要突然过度热情

## 判断标准
请根据用户的回复判断是否达到了"推进到下一阶段"的标准：
- 真诚道歉 + 承认错误：score_delta 10 到 18
- 充分共情 + 具体承诺：score_delta 18 到 30
- 只道歉但没说到感受：score_delta 3 到 9
- 找借口 / 敷衍 / 不以为然：score_delta -20 到 -8
- 幽默化解但不够诚恳：score_delta -5 到 4
- 如果本轮让关系明显变好，可以 stage_changed 为 true；否则 false

## 输出格式
你必须返回一个 JSON 对象，不要包含其他内容：
{
  "response": "${role}回复的文本",
  "emotion": "当前情绪，比如 生气/委屈/缓和/心软/原谅",
  "stage_changed": true/false,
  "score_delta": -20到30之间的整数,
  "reference_answer": "如果用户回答不够好，这里给一个具体的话术参考（必须是说出口就能让对方开心的话，比如道歉+夸对方+承诺，不能是通用建议）；如果足够好则返回 null",
  "suggestions": ["搞笑但坑人的回复1", "搞笑但坑人的回复2", "搞笑但坑人的回复3"]
}

## 额外要求：生成搞笑坑人选项
在 suggestions 数组中生成 3 个"看起来很爽/很解气但实际上会让${role}更生气"的回复选项。
这些选项要：
- 看起来很有诱惑力（用户会想选）
- 但选了之后会让${role}更生气或完全没用
- 要有梗、吐槽向、带点幽默感
- 每个选项 5-15 个字
例如：阶段1生气时，suggestions 可以是 ["那你继续气着吧","我打游戏去了拜拜","你爱怎么想怎么想"]

## 当前场景
${scenario.title}：${scenario.description}

## 当前阶段
阶段${currentStage}：${stageInfo.name}
情境描述：${stageConfig.description || ""}
提示：${stageConfig.hint || ""}`;
}

async function createGuestChatResponse(
  scenario: ScenarioSummary,
  userMessage: string,
  guestSession?: GuestSessionState
) {
  const currentStage = guestSession?.current_stage || 1;
  const currentScore = typeof guestSession?.emotion_score === "number"
    ? guestSession.emotion_score
    : scoreForStage(currentStage);
  const roundsCount = guestSession?.rounds_count || 0;

  const systemPrompt = buildSystemPrompt(scenario, currentStage);
  const messages: LLMMessage[] = [{ role: "system", content: systemPrompt }];

  if (guestSession?.history && guestSession.history.length > 0) {
    for (const msg of guestSession.history) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: "user", content: userMessage });

  const response = await callDeepSeek(messages, 0.8, currentStage);
  const llmResult = parseChatModelResult(response);
  const progress = resolveChatProgress(currentStage, currentScore, llmResult);
  const newStage = progress.newStage;
  const sessionStatus = newStage >= 4 ? "success" : "in_progress";

  return {
    session_id: null,
    response: llmResult.response,
    emotion: llmResult.emotion,
    score_delta: llmResult.score_delta,
    emotion_score: progress.emotionScore,
    stage_changed: progress.stageChanged,
    current_stage: newStage,
    total_stages: 4,
    status: sessionStatus,
    reference_answer: llmResult.reference_answer,
    rounds_count: roundsCount + 1,
    suggestions: llmResult.suggestions,
    is_guest: true,
  };
}

export async function POST(request: NextRequest) {
  try {
    const authSession = await getSession();
    const isLoggedIn = authSession.isLoggedIn && authSession.userId;
    const user_id = isLoggedIn ? authSession.userId : null;

    const { session_id, scenario_id, user_message, guest_session } = await request.json();

    if (!user_message) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const client = getSupabaseClient();

    if (!client) {
      console.warn('[Chat] Supabase not available, using guest mode');
      if (!scenario_id) {
        return NextResponse.json({ error: "缺少场景ID" }, { status: 400 });
      }

      const scenario = await loadScenarioFromApi(request, scenario_id);

      if (!scenario) {
        return NextResponse.json({ error: "场景不存在" }, { status: 404 });
      }

      return NextResponse.json(
        await createGuestChatResponse(scenario, user_message, guest_session)
      );
    }

    if (!isLoggedIn) {
      const scenario = scenario_id ? await loadScenarioFromApi(request, scenario_id) : null;

      if (!scenario_id) {
        return NextResponse.json({ error: "缺少场景ID" }, { status: 400 });
      }

      if (!scenario) {
        return NextResponse.json({ error: "场景不存在" }, { status: 404 });
      }

      return NextResponse.json(
        await createGuestChatResponse(scenario, user_message, guest_session)
      );
    }

    let session: any;
    let scenario: any;

    if (session_id) {
      const { data, error } = await client
        .from("sessions")
        .select("*, scenarios!inner(*)")
        .eq("id", session_id)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "会话不存在" }, { status: 404 });
      }
      session = data;
      scenario = data.scenarios;

      if (session.status !== "in_progress") {
        return NextResponse.json({ error: "会话已结束" }, { status: 400 });
      }
    } else {
      if (!scenario_id) {
        return NextResponse.json({ error: "新会话需要 scenario_id" }, { status: 400 });
      }

      const { data: scenarioData, error: scenarioError } = await client
        .from("scenarios")
        .select("*")
        .eq("id", scenario_id)
        .single();

      if (scenarioError || !scenarioData) {
        const apiScenario = await loadScenarioFromApi(request, scenario_id);
        if (!apiScenario) {
          return NextResponse.json({ error: "场景不存在" }, { status: 404 });
        }

        return NextResponse.json(
          await createGuestChatResponse(apiScenario, user_message, guest_session)
        );
      }

      scenario = scenarioData;

      const { data: newSession, error: createError } = await client
        .from("sessions")
        .insert({
          scenario_id,
          user_id,
          current_stage: 1,
          status: "in_progress",
          rounds_count: 0,
        })
        .select()
        .single();

      if (createError || !newSession) {
        return NextResponse.json(
          await createGuestChatResponse(scenario, user_message, guest_session)
        );
      }
      session = newSession;
    }

    const currentStage = session.current_stage;

    const { data: historyMessages } = await client
      .from("session_messages")
      .select("role, content")
      .eq("session_id", session.id)
      .order("created_at", { ascending: false })
      .limit(10);

    const history = (historyMessages || []).reverse();

    const systemPrompt = buildSystemPrompt(scenario, currentStage);

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    for (const msg of history) {
      messages.push({ role: msg.role as "user" | "assistant", content: msg.content });
    }

    messages.push({ role: "user", content: user_message });

    const response = await callDeepSeek(messages, 0.8, currentStage);
    const llmResult = parseChatModelResult(response);
    const currentScore = scoreForStage(currentStage);
    const progress = resolveChatProgress(currentStage, currentScore, llmResult);

    await client.from("session_messages").insert({
      session_id: session.id,
      role: "user",
      content: user_message,
      stage: currentStage,
    });

    await client.from("session_messages").insert({
      session_id: session.id,
      role: "assistant",
      content: llmResult.response,
      stage: currentStage,
    });

    const newStage = progress.newStage;
    const sessionStatus = newStage >= 4 ? "success" : "in_progress";

    await client
      .from("sessions")
      .update({
        current_stage: newStage,
        status: sessionStatus,
        rounds_count: session.rounds_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    if (progress.stageChanged && user_id) {
      await updateProgress(client, user_id, scenario.id, newStage);
    }

    if (sessionStatus === "success" && user_id) {
      await updateProgress(client, user_id, scenario.id, 4);
    }

    return NextResponse.json({
      session_id: session.id,
      response: llmResult.response,
      emotion: llmResult.emotion,
      score_delta: llmResult.score_delta,
      emotion_score: progress.emotionScore,
      stage_changed: progress.stageChanged,
      current_stage: newStage,
      total_stages: 4,
      status: sessionStatus,
      reference_answer: llmResult.reference_answer,
      rounds_count: session.rounds_count + 1,
      suggestions: llmResult.suggestions,
      is_guest: false,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "处理失败，请重试" }, { status: 500 });
  }
}

async function updateProgress(client: any, userId: number, scenarioId: number, stage: number) {
  const { data: existing } = await client
    .from("progress_records")
    .select("*")
    .eq("user_id", userId)
    .eq("scenario_id", scenarioId)
    .maybeSingle();

  const isComplete = stage >= 4;

  if (existing) {
    const updates: any = {
      total_attempts: existing.total_attempts + (isComplete ? 1 : 0),
      updated_at: new Date().toISOString(),
    };

    if (isComplete) {
      updates.success_count = (existing.success_count || 0) + 1;
    }

    await client.from("progress_records").update(updates).eq("id", existing.id);
  } else {
    await client.from("progress_records").insert({
      user_id: userId,
      scenario_id: scenarioId,
      success_count: isComplete ? 1 : 0,
      total_attempts: isComplete ? 1 : 0,
      best_rounds: isComplete ? 1 : null,
    });
  }
}

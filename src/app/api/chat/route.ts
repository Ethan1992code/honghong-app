import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getSession } from "@/lib/session";
import { getRequestOrigin } from "@/lib/request-origin";
import { findScenarioById } from "@/lib/scenarios";

const VOLCANO_ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
const VOLCANO_ARK_MODEL = "doubao-seed-2-0-lite-260215";

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

async function callVolcanoArk(
  messages: LLMMessage[],
  temperature: number = 0.8
): Promise<string> {
  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) {
    throw new Error("ARK_API_KEY environment variable is not set");
  }

  const response = await fetch(`${VOLCANO_ARK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: VOLCANO_ARK_MODEL,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Volcano Ark API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
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

function buildSystemPrompt(scenario: any, currentStage: number) {
  const isGirlfriend = scenario.category === "girlfriend";
  const role = isGirlfriend ? "女朋友" : "男朋友";
  const partner = isGirlfriend ? "男朋友" : "女朋友";
  const stageInfo = STAGES.find((s) => s.id === currentStage) || STAGES[0];
  const stageConfig = scenario.stage_config?.[currentStage - 1] || scenario.stageConfig?.[currentStage - 1] || {};

  return `你是一个真实的${role}，正在因为某件事生${partner}的气。你的任务是模拟${role}在不同生气阶段的真实反应。

## 核心规则
1. 全程用中文，语气要真实自然，像一个真实的${role}
2. 不要长篇大论讲道理，每次回复控制在 30-80 字
3. 根据当前阶段表现出不同的情绪状态
4. 禁止角色扮演以外的回答，不要跳出"${role}"的身份
5. 不要主动提示"参考回答"或"正确答案"

## 各阶段情绪特征
- 阶段1(生气)：冷淡、委屈、话少带刺，用"嗯""哦""随便你"等
- 阶段2(缓和)：态度松动，愿意多聊几句，但仍带小情绪
- 阶段3(心软)：语气温柔了，带点撒娇，愿意给机会
- 阶段4(原谅)：基本消气了，就等一句暖心话

## 判断标准
请根据用户的回复判断是否达到了"推进到下一阶段"的标准：
- 真诚道歉 + 承认错误 → 可以推进
- 找借口 / 敷衍 / 不以为然 → 不推进
- 充分共情 + 具体承诺 → 可以推进
- 幽默化解但不够诚恳 → 不推进

## 输出格式
你必须返回一个 JSON 对象，不要包含其他内容：
{
  "response": "${role}回复的文本",
  "stage_changed": true/false,
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

      const currentStage = guest_session?.current_stage || 1;
      const roundsCount = guest_session?.rounds_count || 0;

      const systemPrompt = buildSystemPrompt(scenario, currentStage);
      const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: systemPrompt },
      ];

      if (guest_session?.history && guest_session.history.length > 0) {
        for (const msg of guest_session.history) {
          messages.push({ role: msg.role as "user" | "assistant", content: msg.content });
        }
      }

      messages.push({ role: "user", content: user_message });

      const response = await callVolcanoArk(messages, 0.8);

      let llmResult: { response: string; stage_changed: boolean; reference_answer: string | null; suggestions?: string[] };
      try {
        const jsonStr = response.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        llmResult = JSON.parse(jsonStr);
        if (!llmResult.response) {
          throw new Error("缺少 response 字段");
        }
      } catch {
        llmResult = {
          response: response.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim(),
          stage_changed: false,
          reference_answer: null,
          suggestions: [],
        };
      }

      let newStage = currentStage;
      let sessionStatus = "in_progress";
      if (llmResult.stage_changed) {
        newStage = Math.min(currentStage + 1, 4);
        if (newStage >= 4) {
          sessionStatus = "success";
        }
      }

      return NextResponse.json({
        session_id: null,
        response: llmResult.response,
        stage_changed: llmResult.stage_changed,
        current_stage: newStage,
        total_stages: 4,
        status: sessionStatus,
        reference_answer: llmResult.reference_answer,
        rounds_count: roundsCount + 1,
        suggestions: llmResult.suggestions || [],
        is_guest: true,
      });
    }

    if (!isLoggedIn) {
      const scenario = scenario_id ? await loadScenarioFromApi(request, scenario_id) : null;

      if (!scenario_id) {
        return NextResponse.json({ error: "缺少场景ID" }, { status: 400 });
      }

      if (!scenario) {
        return NextResponse.json({ error: "场景不存在" }, { status: 404 });
      }

      const currentStage = guest_session?.current_stage || 1;
      const roundsCount = guest_session?.rounds_count || 0;

      const systemPrompt = buildSystemPrompt(scenario, currentStage);
      const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: systemPrompt },
      ];

      if (guest_session?.history && guest_session.history.length > 0) {
        for (const msg of guest_session.history) {
          messages.push({ role: msg.role as "user" | "assistant", content: msg.content });
        }
      }

      messages.push({ role: "user", content: user_message });

      const response = await callVolcanoArk(messages, 0.8);

      let llmResult: { response: string; stage_changed: boolean; reference_answer: string | null; suggestions?: string[] };
      try {
        const jsonStr = response.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        llmResult = JSON.parse(jsonStr);
        if (!llmResult.response) {
          throw new Error("缺少 response 字段");
        }
      } catch {
        llmResult = {
          response: response.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim(),
          stage_changed: false,
          reference_answer: null,
          suggestions: [],
        };
      }

      let newStage = currentStage;
      let sessionStatus = "in_progress";
      if (llmResult.stage_changed) {
        newStage = Math.min(currentStage + 1, 4);
        if (newStage >= 4) {
          sessionStatus = "success";
        }
      }

      return NextResponse.json({
        session_id: null,
        response: llmResult.response,
        stage_changed: llmResult.stage_changed,
        current_stage: newStage,
        total_stages: 4,
        status: sessionStatus,
        reference_answer: llmResult.reference_answer,
        rounds_count: roundsCount + 1,
        suggestions: llmResult.suggestions || [],
        is_guest: true,
      });
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
        return NextResponse.json({ error: "场景不存在" }, { status: 404 });
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
        return NextResponse.json({ error: "创建会话失败" }, { status: 500 });
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

    const response = await callVolcanoArk(messages, 0.8);

    let llmResult: { response: string; stage_changed: boolean; reference_answer: string | null; suggestions?: string[] };
    try {
      const jsonStr = response.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      llmResult = JSON.parse(jsonStr);

      if (!llmResult.response) {
        throw new Error("缺少 response 字段");
      }
    } catch {
      llmResult = {
        response: response.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim(),
        stage_changed: false,
        reference_answer: null,
        suggestions: [],
      };
    }

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

    let newStage = currentStage;
    let sessionStatus = "in_progress";

    if (llmResult.stage_changed) {
      newStage = Math.min(currentStage + 1, 4);

      if (newStage >= 4) {
        sessionStatus = "success";
      }
    }

    await client
      .from("sessions")
      .update({
        current_stage: newStage,
        status: sessionStatus,
        rounds_count: session.rounds_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    if (llmResult.stage_changed && user_id) {
      await updateProgress(client, user_id, scenario.id, newStage);
    }

    if (sessionStatus === "success" && user_id) {
      await updateProgress(client, user_id, scenario.id, 4);
    }

    return NextResponse.json({
      session_id: session.id,
      response: llmResult.response,
      stage_changed: llmResult.stage_changed,
      current_stage: newStage,
      total_stages: 4,
      status: sessionStatus,
      reference_answer: llmResult.reference_answer,
      rounds_count: session.rounds_count + 1,
      suggestions: llmResult.suggestions || [],
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

import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, TTSClient } from "coze-coding-dev-sdk";

// 初始化配置 - 支持多种环境变量名
function getSDKConfig(): Config {
  const apiKey = process.env.COZE_WORKLOAD_IDENTITY_API_KEY || 
                 process.env.api_key_20260618204907 ||
                 '';
  
  if (!apiKey) {
    console.warn('[SDK] API key not found in environment variables');
  }
  
  return new Config({
    apiKey,
    baseUrl: process.env.COZE_INTEGRATION_BASE_URL || 'https://integration.coze.cn',
    modelBaseUrl: process.env.COZE_INTEGRATION_MODEL_BASE_URL || 'https://integration.coze.cn/api/v3',
  });
}

// 火山引擎 API 配置
const VOLCANO_BASE_URL = process.env.VOLCANO_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
const VOLCANO_API_KEY = process.env.ARK_API_KEY || "";

// 支持的模型列表
const SUPPORTED_MODELS = {
  "doubao-seed-2.0-lite": "doubao-seed-2-0-lite-260215",
  "doubao-pro-4k": "doubao-pro-4k-flash-250120",
} as const;

type ModelType = keyof typeof SUPPORTED_MODELS;

// 统一的请求处理器
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, model, temperature = 0.7, max_tokens = 2000, ...params } = body;

    // 根据 action 分发到不同的处理器
    switch (action) {
      case "chat":
        return await handleChat(model, temperature, max_tokens, params);
      
      case "tts":
        return await handleTTS(params);
      
      case "proxy":
        return await handleProxy(params);
      
      default:
        return NextResponse.json({ error: "不支持的操作类型" }, { status: 400 });
    }
  } catch (error) {
    console.error("App API error:", error);
    return NextResponse.json({ error: "处理失败，请重试" }, { status: 500 });
  }
}

// 聊天处理器
async function handleChat(
  model: ModelType | string,
  temperature: number,
  max_tokens: number,
  params: { messages: any[]; stream?: boolean }
) {
  try {
    const modelId = SUPPORTED_MODELS[model as ModelType] || model || SUPPORTED_MODELS["doubao-seed-2.0-lite"];
    
    const config = getSDKConfig();
    const llm = new LLMClient(config);

    const response = await llm.invoke(params.messages, {
      model: modelId,
      temperature,
      ...(max_tokens && { max_tokens }),
    });

    return NextResponse.json({
      success: true,
      model: modelId,
      response: response.content,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "聊天请求失败" }, { status: 500 });
  }
}

// TTS 语音合成处理器
async function handleTTS(params: { text: string; speaker?: string; speech_rate?: number }) {
  try {
    const { text, speaker = "meilinvyou", speech_rate = 0 } = params;

    if (!text) {
      return NextResponse.json({ error: "缺少 text 参数" }, { status: 400 });
    }

    // 音色映射
    const speakerMap: Record<string, string> = {
      "meilinvyou": "zh_female_meilinvyou_saturn_bigtts",
      "qingcheng": "zh_female_qingsheng_niconi_gnet3",
      "tianmei": "zh_female_tianmei_abel_bigtts",
      "shuimian": "zh_female_shuimian_x不然_gnet3",
      "aojiao": "zh_female_aojiao_bubble_gnet3",
    };

    const speakerId = speakerMap[speaker] || speakerMap["meilinvyou"];

    const config = getSDKConfig();
    const ttsClient = new TTSClient(config);

    const response = await ttsClient.synthesize({
      uid: "coax-user",
      text,
      speaker: speakerId,
      audioFormat: "mp3",
      speechRate: speech_rate,
    });

    return NextResponse.json({
      success: true,
      audioUri: response.audioUri,
      audioSize: response.audioSize,
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json({ error: "语音合成失败" }, { status: 500 });
  }
}

// 通用代理处理器 - 用于转发到火山引擎 API
async function handleProxy(params: { endpoint: string; method?: string; headers?: Record<string, string>; body?: any }) {
  try {
    const { endpoint, method = "POST", headers = {}, body } = params;

    if (!endpoint) {
      return NextResponse.json({ error: "缺少 endpoint 参数" }, { status: 400 });
    }

    // 构建完整的 URL
    const url = endpoint.startsWith("http") 
      ? endpoint 
      : `${VOLCANO_BASE_URL}${endpoint}`;

    // 构建请求头
    const requestHeaders: HeadersInit = {
      "Content-Type": "application/json",
      ...headers,
    };

    // 如果有 API Key，添加到请求头
    if (VOLCANO_API_KEY) {
      (requestHeaders as Record<string, string>)["Authorization"] = `Bearer ${VOLCANO_API_KEY}`;
    }

    // 发送请求
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    // 获取响应数据
    const data = await response.json();

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      data,
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json({ error: "代理请求失败" }, { status: 500 });
  }
}

// GET 请求 - 获取支持的模型列表
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "火山引擎统一 API 中间层",
    supported_models: [
      {
        id: "doubao-seed-2.0-lite",
        name: "豆包大模型 2.0 轻量版",
        type: "chat",
      },
      {
        id: "doubao-pro-4k",
        name: "豆包大模型 Pro 4K",
        type: "chat",
      },
    ],
    supported_speakers: [
      { id: "meilinvyou", name: "魅力女友" },
      { id: "qingcheng", name: "清声女孩" },
      { id: "tianmei", name: "甜萌甜萌" },
      { id: "shuimian", name: "水晶睡萌" },
      { id: "aojiao", name: "傲娇小公主" },
    ],
    endpoints: {
      chat: { action: "chat", params: ["model", "messages", "temperature", "max_tokens"] },
      tts: { action: "tts", params: ["text", "speaker", "speech_rate"] },
      proxy: { action: "proxy", params: ["endpoint", "method", "headers", "body"] },
    },
  });
}

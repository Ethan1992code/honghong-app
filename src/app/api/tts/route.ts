import { NextRequest, NextResponse } from "next/server";
import { TTSClient, Config } from "coze-coding-dev-sdk";

// 初始化配置 - 支持多种环境变量名
function getTTSConfig(): Config {
  const apiKey = process.env.COZE_WORKLOAD_IDENTITY_API_KEY || 
                 process.env['api-key-20260618204907'] ||
                 process.env.api_key_20260618204907 ||
                 '';
  
  if (!apiKey) {
    console.warn('[TTS] API key not found in environment variables');
  }
  
  return new Config({
    apiKey,
    baseUrl: process.env.COZE_INTEGRATION_BASE_URL || 'https://integration.coze.cn',
    modelBaseUrl: process.env.COZE_INTEGRATION_MODEL_BASE_URL || 'https://integration.coze.cn/api/v3',
  });
}

const SPEAKER_OPTIONS = {
  meilinvyou: "zh_female_meilinvyou_saturn_bigtts",
} as const;

type SpeakerType = keyof typeof SPEAKER_OPTIONS;

// POST /api/tts - 将文本转为语音，返回音频 URL
export async function POST(request: NextRequest) {
  try {
    const { text, uid, speaker = "meilinvyou" } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "缺少 text 参数" }, { status: 400 });
    }

    const speakerId = SPEAKER_OPTIONS[speaker as SpeakerType] || SPEAKER_OPTIONS.meilinvyou;

    const config = getTTSConfig();
    const ttsClient = new TTSClient(config);

    const response = await ttsClient.synthesize({
      uid: uid || "coax-user",
      text,
      speaker: speakerId,
      audioFormat: "mp3",
      speechRate: 0,
    });

    return NextResponse.json({
      audioUri: response.audioUri,
      audioSize: response.audioSize,
    });
  } catch (error) {
    console.error("TTS API error:", error);
    return NextResponse.json({ error: "语音合成失败" }, { status: 500 });
  }
}
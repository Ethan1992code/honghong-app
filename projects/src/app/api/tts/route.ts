import { NextRequest, NextResponse } from "next/server";
import { TTSClient, Config } from "coze-coding-dev-sdk";

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

    const config = new Config();
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
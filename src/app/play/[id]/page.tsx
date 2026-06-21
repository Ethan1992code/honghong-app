"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { ArrowLeft, Mic, Plus, Send, Volume2, VolumeX, Loader2 } from "lucide-react";

interface StageConfig {
  name: string;
  description: string;
  hint: string;
}

interface Scenario {
  id: number;
  title: string;
  description: string;
  emotion_level: number;
  category: string;
  stage_config: StageConfig[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
  stage?: number;
}

interface ChatResponse {
  session_id: string;
  response: string;
  emotion?: string;
  score_delta?: number;
  emotion_score?: number;
  stage_changed: boolean;
  current_stage: number;
  total_stages: number;
  status: string;
  reference_answer: string | null;
  rounds_count: number;
  suggestions: string[];
}

const STAGE_EMOJIS = ["😤", "😐", "😊", "🥰"];
const STAGE_COLORS = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-400"];
const STAGE_BG = ["bg-red-50", "bg-orange-50", "bg-amber-50", "bg-green-50"];

const SPEAKER_OPTIONS = [
  { id: "meilinvyou", name: "魅力女友", emoji: "👩" },
];

export default function PlayPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const category = searchParams.get("category") || "girlfriend";
  const isGirlfriend = category === "girlfriend";

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [currentStage, setCurrentStage] = useState(1);
  const [emotionScore, setEmotionScore] = useState(0);
  const [totalStages] = useState(4);
  const [sessionStatus, setSessionStatus] = useState("in_progress");
  const [referenceAnswer, setReferenceAnswer] = useState<string | null>(null);
  const [showReference, setShowReference] = useState(false);
  const [lastSuggestions, setLastSuggestions] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedSpeaker, setSelectedSpeaker] = useState("meilinvyou");
  const [showSpeakerMenu, setShowSpeakerMenu] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [stageJustChanged, setStageJustChanged] = useState(false);
  const [showFailed, setShowFailed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [roundsCount, setRoundsCount] = useState(0);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const pronoun = isGirlfriend ? "她" : "他";
  const partnerName = isGirlfriend ? "小可爱" : "大宝贝";
  const avatarEmoji = isGirlfriend ? "👩" : "👨";

  // 加载场景（游客也可玩）
  useEffect(() => {
    const loadScenario = async () => {
      try {
        const res = await fetch("/api/scenarios");
        const data = await res.json();
        const found = data.scenarios.find((s: Scenario) => s.id === Number(id));
        if (found) {
          setScenario(found);
        }
      } catch (e) {
        console.error("加载场景失败", e);
      } finally {
        setLoading(false);
      }
    };
    if (id) loadScenario();
  }, [id]);

  // 自动滚动
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, lastSuggestions]);

  // 播放语音
  const speakMessage = useCallback(async (text: string) => {
    if (!soundEnabled) return;
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, speaker: selectedSpeaker }),
      });
      const data = await res.json();
      if (data.audioUri) {
        setPlayingAudio(data.audioUri);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        const audio = new Audio(data.audioUri);
        audioRef.current = audio;
        audio.onended = () => {
          setPlayingAudio(null);
          setAvatarError(false);
        };
        audio.onerror = () => {
          setPlayingAudio(null);
          setAvatarError(true);
        };
        await audio.play();
      }
    } catch {
      // 语音播放失败静默处理
    }
  }, [soundEnabled, selectedSpeaker]);

  // 发送消息
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending || sessionStatus !== "in_progress") return;

    setSending(true);
    setLastSuggestions([]);

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");

    try {
      const body: Record<string, unknown> = {
        user_message: text,
        scenario_id: Number(id),
      };

      // 登录用户：传 session_id
      if (sessionId && !isGuest) {
        body.session_id = sessionId;
      }

      // 游客模式：传 guest_session
      if (isGuest || !sessionId) {
        body.guest_session = {
          current_stage: currentStage,
          emotion_score: emotionScore,
          rounds_count: roundsCount,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        };
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const data: ChatResponse & { is_guest?: boolean } = await res.json();

      if (!res.ok) {
        throw new Error(data.response || "请求失败");
      }

      // 标记是否是游客模式
      if (data.is_guest) {
        setIsGuest(true);
      } else if (data.session_id) {
        setSessionId(data.session_id);
        setIsGuest(false);
      }

      // 更新轮次
      setRoundsCount(data.rounds_count);
      if (typeof data.emotion_score === "number") {
        setEmotionScore(data.emotion_score);
      }

      const stageChanged = data.stage_changed;
      if (stageChanged) {
        setCurrentStage(data.current_stage);
      }

      const aiMsg: Message = {
        role: "assistant",
        content: data.response,
        suggestions: data.suggestions,
        stage: data.current_stage,
      };
      setMessages((prev) => [...prev, aiMsg]);

      if (data.suggestions && data.suggestions.length > 0) {
        setLastSuggestions(data.suggestions);
      }

      if (data.status === "success") {
        setSessionStatus("success");
        setTimeout(() => setShowSuccess(true), 500);
      }

      if (data.status === "failed") {
        setSessionStatus("failed");
        setReferenceAnswer(data.reference_answer);
        setTimeout(() => setShowFailed(true), 500);
      }

      if (stageChanged) {
        setStageJustChanged(true);
        setTimeout(() => setStageJustChanged(false), 2000);

        const stageName = scenario?.stage_config?.[data.current_stage - 1]?.name || "";
        if (stageName && soundEnabled) {
          const stageText = isGirlfriend
            ? `她${stageName}了`
            : `他${stageName}了`;
          speakMessage(stageText);
        }
      } else {
        speakMessage(data.response);
      }

      setCurrentStage((prev) => {
        if (data.current_stage > prev) return data.current_stage;
        return prev;
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "（网络开小差了，再试试？）" },
      ]);
    } finally {
      setSending(false);
    }
  }, [sending, sessionStatus, sessionId, id, currentStage, emotionScore, scenario, isGirlfriend, soundEnabled, speakMessage, messages, roundsCount, isGuest]);

  // 点击搞笑选项
  const handleSuggestionClick = (text: string) => {
    sendMessage(text);
  };

  // 重试
  const handleRetry = () => {
    setMessages([]);
    setSessionId(null);
    setCurrentStage(1);
    setEmotionScore(0);
    setSessionStatus("in_progress");
    setReferenceAnswer(null);
    setLastSuggestions([]);
    setShowFailed(false);
    setShowSuccess(false);
    setRoundsCount(0);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-100 p-6">
        <p className="text-lg text-gray-500">场景不存在</p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 rounded-lg bg-blue-500 px-6 py-2 text-white"
        >
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col bg-gray-100">
      {/* ============ WeChat Header ============ */}
      <div className="flex-none" style={{ backgroundColor: isGirlfriend ? "#d84b5a" : "#4a7ec4" }}>
        <div className="flex items-center px-3 py-3 text-white">
          <button onClick={() => router.push("/")} className="mr-2 flex items-center">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-lg">
              {avatarEmoji}
            </div>
            <div>
              <div className="text-sm font-medium">{scenario.title}</div>
              <div className="flex items-center gap-1 text-[10px] text-white/70">
                {STAGE_EMOJIS.slice(0, totalStages).map((emoji, i) => (
                  <span key={i} className={i + 1 <= currentStage ? "" : "opacity-30"}>
                    {emoji}
                  </span>
                ))}
                <span className="ml-1">
                  {currentStage > totalStages
                    ? "已原谅"
                    : scenario.stage_config?.[currentStage - 1]?.name || ""}
                </span>
              </div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-1">
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowSpeakerMenu(!showSpeakerMenu)} 
                className="p-1"
              >
                <span className="text-sm">{SPEAKER_OPTIONS.find(s => s.id === selectedSpeaker)?.emoji || "👩"}</span>
              </button>
              {showSpeakerMenu && (
                <div className="absolute right-0 top-full mt-1 w-36 rounded-lg bg-white shadow-lg z-50">
                  {SPEAKER_OPTIONS.map((speaker) => (
                    <button
                      key={speaker.id}
                      onClick={() => {
                        setSelectedSpeaker(speaker.id);
                        setShowSpeakerMenu(false);
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-pink-50 ${
                        selectedSpeaker === speaker.id ? "bg-pink-100" : ""
                      }`}
                    >
                      <span>{speaker.emoji}</span>
                      <span>{speaker.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============ Progress Bar ============ */}
      <div className="flex h-1 flex-none bg-gray-200">
        {Array.from({ length: totalStages }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 transition-all duration-500 ${
              i + 1 <= currentStage ? STAGE_COLORS[i] : ""
            } ${i > 0 ? "ml-0.5" : ""}`}
          />
        ))}
      </div>

      {/* 阶段切换提示横幅 */}
      {stageJustChanged && currentStage <= totalStages && (
        <div className={`flex-none px-4 py-2 text-center text-sm font-medium ${STAGE_BG[currentStage - 1]} text-gray-700`}>
          {isGirlfriend ? "她" : "他"}
          {STAGE_EMOJIS[currentStage - 1]} {scenario.stage_config?.[currentStage - 1]?.name}了！
        </div>
      )}

      {/* 当前阶段提示话术（常驻） */}
      {currentStage > 0 && currentStage <= totalStages && sessionStatus === "in_progress" && scenario.stage_config?.[currentStage - 1]?.hint && (
        <div className="flex-none border-b border-yellow-100 bg-yellow-50 px-4 py-1.5 text-center text-xs text-amber-700">
          💡 提示：{scenario.stage_config[currentStage - 1].hint}
        </div>
      )}

      {/* ============ Chat Area ============ */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {/* 开场白 */}
        <div className="mb-3 text-center">
          <div className="mb-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm text-2xl">
              {avatarEmoji}
            </div>
          </div>
          <div className="mx-auto max-w-[80%] rounded-2xl bg-white px-4 py-2.5 text-sm text-gray-700 shadow-sm"
            style={{ borderRadius: "12px 12px 12px 4px" }}>
            <p className="mb-1 font-medium">{scenario.title}</p>
            <p className="text-xs text-gray-500">{scenario.description}</p>
          </div>
        </div>

        {/* 消息列表 */}
        {messages.map((msg, i) => (
          <div key={i} className="mb-4">
            {msg.role === "assistant" ? (
              <div className="flex items-start gap-2">
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white shadow-sm text-base">
                  {avatarEmoji}
                </div>
                <div
                  className="max-w-[75%] rounded-2xl bg-white px-3.5 py-2.5 text-sm text-gray-800 shadow-sm"
                  style={{ borderRadius: "4px 12px 12px 12px" }}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  {/* 语音播放按钮 */}
                  {msg.content && (
                    <button
                      onClick={() => speakMessage(msg.content)}
                      className="mt-1 flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600"
                    >
                      {playingAudio ? <Volume2 className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                      听{pronoun}说
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <div
                  className="max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm text-white shadow-sm"
                  style={{
                    backgroundColor: isGirlfriend ? "#d84b5a" : "#4a7ec4",
                    borderRadius: "12px 4px 12px 12px",
                  }}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            )}

            {/* 搞笑选项按钮（在 AI 消息下方） */}
            {msg.role === "assistant" && msg.suggestions && msg.suggestions.length > 0 && sessionStatus === "in_progress" && (
              <div className="ml-11 mt-2 flex flex-wrap gap-2">
                {msg.suggestions.map((sug, j) => (
                  <button
                    key={j}
                    onClick={() => handleSuggestionClick(sug)}
                    disabled={sending}
                    className="rounded-full border border-dashed border-gray-300 bg-white/80 px-3.5 py-1.5 text-xs text-gray-600 shadow-sm transition-all hover:scale-105 hover:border-red-300 hover:bg-red-50 hover:text-red-600 active:scale-95 disabled:opacity-50"
                  >
                    😈 {sug}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* 失败弹层 */}
        {showFailed && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-center">
            <p className="mb-2 text-lg">😅 炸了炸了</p>
            <p className="mb-3 text-sm text-gray-600">
              {pronoun}更生气了... 要不看看参考答案？
            </p>
            {referenceAnswer && (
              <div className="mb-3 rounded-lg bg-white p-3 text-left text-sm text-gray-700">
                <p className="mb-1 font-medium text-gray-500">💡 参考答案：</p>
                <p>{referenceAnswer}</p>
              </div>
            )}
            <button
              onClick={handleRetry}
              className="rounded-lg bg-blue-500 px-6 py-2 text-sm text-white hover:bg-blue-600"
            >
              重来一次
            </button>
          </div>
        )}

        {/* 成功弹层 */}
        {showSuccess && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-center">
            <p className="mb-1 text-lg">
              {isGirlfriend ? "🥰 她原谅你了！" : "🥰 他原谅你了！"}
            </p>
            <p className="mb-3 text-sm text-gray-500">一共用了 {messages.filter(m => m.role === "user").length} 句话</p>
            <button
              onClick={() => router.push("/progress")}
              className="rounded-lg bg-green-500 px-6 py-2 text-sm text-white hover:bg-green-600"
            >
              查看进步曲线
            </button>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ============ WeChat Input Area ============ */}
      {sessionStatus === "in_progress" && (
        <div className="flex-none border-t border-gray-200 bg-white px-3 py-2">
          {/* 参考话术 / 提示切换 */}
          <div className="mb-1.5 flex items-center justify-between px-1">
            <span className="text-[10px] text-gray-400">
              {isGirlfriend ? "哄哄" : "哄哄"}{pronoun}吧 💪
            </span>
            {referenceAnswer && (
              <button
                onClick={() => setShowReference(!showReference)}
                className="text-[10px] text-blue-500 hover:text-blue-700"
              >
                📖 参考话术
              </button>
            )}
          </div>
          {/* 参考话术展开 */}
          {showReference && referenceAnswer && (
            <div className="mb-2 rounded-lg border border-blue-100 bg-blue-50 p-2.5 text-xs text-gray-700">
              <p className="mb-1 font-medium text-blue-600">💡 参考回答：</p>
              <p>{referenceAnswer}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100">
              <Plus className="h-5 w-5" />
            </button>
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息..."
                disabled={sending}
                className="w-full rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm outline-none transition-colors focus:border-gray-300 focus:bg-white disabled:opacity-50"
              />
            </div>
            {input.trim() ? (
              <button
                onClick={() => sendMessage(input)}
                disabled={sending}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: isGirlfriend ? "#d84b5a" : "#4a7ec4" }}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            ) : (
              <button className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100">
                <Mic className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 隐藏的 audio 元素 */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}

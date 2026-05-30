"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Heart, Trophy, Target, TrendingUp, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// 场景名称映射
const SCENARIO_NAMES: Record<number, string> = {
  1: "约会迟到",
  2: "忘了纪念日",
  3: "说错话惹生气",
  4: "沉迷游戏忽略了她",
  5: "和异性走得太近",
  6: "答应的事没做到",
  7: "不主动报备",
  8: "冷战不主动哄",
};

export default function ProgressPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/progress", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setData(data);
        }
      })
      .catch(() => setError("加载失败"))
      .finally(() => setLoading(false));
  }, []);

  const summary = data?.summary || {
    total_success: 0,
    total_attempts: 0,
    completed_scenarios: 0,
    total_scenarios: 8,
  };

  const progressRecords = data?.progress || [];
  const sessions = data?.sessions || [];

  // 计算进步曲线数据 - 按时间排序的完成会话
  const curveData = sessions.map((s: any, idx: number) => ({
    name: `第${idx + 1}次`,
    轮次: s.rounds_count,
  }));

  const getScenarioName = (id: number) => SCENARIO_NAMES[id] || `场景${id}`;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {/* 头部 */}
      <header className="mb-6 flex items-center">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.push("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="ml-2">
          <h1 className="text-lg font-bold text-gray-800">成长记录</h1>
          <p className="text-xs text-gray-400">看看你的哄人技能进步了多少</p>
        </div>
      </header>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-pink-100">
          <CardContent className="p-8 text-center">
            <Heart className="mx-auto mb-3 h-12 w-12 text-pink-300" />
            <p className="text-gray-600 mb-4">{error}</p>
            <Button
              className="bg-pink-500 hover:bg-pink-600"
              onClick={() => router.push("/login")}
            >
              去登录
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 统计卡片 */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            <Card className="border-pink-100">
              <CardContent className="p-4 text-center">
                <Trophy className="mx-auto mb-1 h-6 w-6 text-pink-500" />
                <p className="text-2xl font-bold text-gray-800">{summary.total_success}</p>
                <p className="text-xs text-gray-400">成功哄好次数</p>
              </CardContent>
            </Card>
            <Card className="border-pink-100">
              <CardContent className="p-4 text-center">
                <Target className="mx-auto mb-1 h-6 w-6 text-orange-500" />
                <p className="text-2xl font-bold text-gray-800">
                  {summary.completed_scenarios}/{summary.total_scenarios}
                </p>
                <p className="text-xs text-gray-400">已掌握场景</p>
              </CardContent>
            </Card>
          </div>

          {/* 进步曲线 */}
          {curveData.length > 1 && (
            <Card className="mb-6 border-pink-100">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  进步曲线
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-2">
                  {curveData.map((point: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="w-14 text-xs text-gray-400">{point.name}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{point.轮次} 轮</span>
                          <span className="text-xs text-gray-300">
                            {idx > 0 && point.轮次 < curveData[idx - 1].轮次
                              ? "↑ 进步"
                              : idx > 0 && point.轮次 > curveData[idx - 1].轮次
                                ? "↓"
                                : ""}
                          </span>
                        </div>
                        <Progress
                          value={Math.min(100, (1 / point.轮次) * 100)}
                          className={`h-2 ${
                            idx === curveData.length - 1 || point.轮次 <= (curveData[idx - 1]?.轮次 || 99)
                              ? "bg-green-100 [&>div]:bg-green-500"
                              : "bg-gray-100"
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-gray-400">
                  {curveData.length >= 2 &&
                  curveData[curveData.length - 1].轮次 < curveData[0].轮次
                    ? "✨ 有进步！同样场景用的轮次越来越少了"
                    : "坚持练习，你会越来越会哄人"}
                </p>
              </CardContent>
            </Card>
          )}

          {curveData.length <= 1 && (
            <Card className="mb-6 border-pink-100 bg-pink-50/50">
              <CardContent className="p-6 text-center">
                <TrendingUp className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">
                  完成至少 2 次哄人练习后，这里会显示你的进步曲线
                </p>
              </CardContent>
            </Card>
          )}

          {/* 各场景进度 */}
          <Card className="border-pink-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">场景掌握度</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((scenarioId) => {
                const record = progressRecords.find(
                  (r: any) => r.scenario_id === scenarioId
                );
                const successCount = record?.success_count || 0;
                const totalAttempts = record?.total_attempts || 0;
                const hasCompleted = successCount > 0;

                return (
                  <div key={scenarioId} className="flex items-center gap-3 py-2">
                    <div className="flex h-8 w-8 items-center justify-center">
                      {hasCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-200" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">
                        {getScenarioName(scenarioId)}
                      </p>
                      {hasCompleted ? (
                        <p className="text-xs text-green-500">
                          成功 {successCount} 次 / 共 {totalAttempts} 次
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">尚未挑战</p>
                      )}
                    </div>
                    {hasCompleted && (
                      <span className="text-xs text-green-500">✓</span>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* 底部导航 */}
          <div className="mt-8 text-center">
            <Button
              className="rounded-full bg-pink-500 px-8 hover:bg-pink-600"
              onClick={() => router.push("/")}
            >
              <Heart className="mr-1 h-4 w-4" />
              继续练习
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
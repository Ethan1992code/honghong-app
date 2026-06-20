"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Trophy, Medal, Crown, Flame, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string | null;
  totalSuccess: number | null;
  totalAttempts: number | null;
  completedScenarios: number | null;
  bestRounds: number | null;
  winRate: number;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  totalUsers: number;
  totalScenarios: number;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch("/api/leaderboard");
        if (!res.ok) throw new Error("获取排行榜失败");
        const result = await res.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-amber-600" />;
    return <span className="font-bold text-gray-400">#{rank}</span>;
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-100 to-yellow-50 border-yellow-300";
    if (rank === 2) return "bg-gradient-to-r from-gray-100 to-gray-50 border-gray-300";
    if (rank === 3) return "bg-gradient-to-r from-amber-100 to-amber-50 border-amber-300";
    return "bg-white border-gray-200";
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-pink-50 to-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500" />
          <p className="text-gray-500">加载排行榜中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <header className="mb-6 flex items-center">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.push("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="ml-2">
            <h1 className="text-lg font-bold text-gray-800">排行榜</h1>
          </div>
        </header>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-red-500">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              重试
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-white">
      {/* 头部 */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-lg px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.push("/")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="ml-2 flex items-center gap-2">
                <Trophy className="h-6 w-6 text-pink-500" />
                <h1 className="text-xl font-bold text-gray-800">排行榜</h1>
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-pink-100 px-3 py-1 text-sm text-pink-600">
              <Flame className="h-4 w-4" />
              <span>{data?.totalUsers || 0} 位玩家</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 pb-8">
        {/* 统计信息 */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <Card className="border-pink-100 bg-gradient-to-br from-pink-50 to-white">
            <CardContent className="p-4 text-center">
              <TrendingUp className="mx-auto mb-2 h-8 w-8 text-pink-500" />
              <p className="text-2xl font-bold text-gray-800">{data?.totalScenarios || 0}</p>
              <p className="text-xs text-gray-500">场景总数</p>
            </CardContent>
          </Card>
          <Card className="border-pink-100 bg-gradient-to-br from-pink-50 to-white">
            <CardContent className="p-4 text-center">
              <Trophy className="mx-auto mb-2 h-8 w-8 text-pink-500" />
              <p className="text-2xl font-bold text-gray-800">{data?.leaderboard.length || 0}</p>
              <p className="text-xs text-gray-500">上榜玩家</p>
            </CardContent>
          </Card>
        </div>

        {/* 排行榜列表 */}
        {data?.leaderboard.length === 0 ? (
          <Card className="border-pink-100">
            <CardContent className="p-12 text-center">
              <Trophy className="mx-auto mb-4 h-16 w-16 text-pink-300" />
              <h2 className="mb-2 text-lg font-medium text-gray-700">还没有玩家上榜</h2>
              <p className="text-sm text-gray-400">
                成为第一个上榜的玩家吧！
              </p>
              <Button
                onClick={() => router.push("/")}
                className="mt-4 bg-pink-500 hover:bg-pink-600"
              >
                开始游戏
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* 前三名特别展示 */}
            {data?.leaderboard.slice(0, 3).map((entry) => (
              <Card
                key={entry.userId}
                className={`overflow-hidden border-2 ${getRankStyle(entry.rank)} transition-all hover:scale-[1.02]`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
                      {getRankIcon(entry.rank)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-800">
                          {entry.username || "匿名用户"}
                        </p>
                        {entry.rank <= 3 && (
                          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                            TOP {entry.rank}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                        <span>🏆 {entry.totalSuccess || 0} 次成功</span>
                        <span>📊 {entry.winRate}% 胜率</span>
                      </div>
                    </div>
                    {entry.bestRounds && (
                      <div className="text-right">
                        <p className="text-xs text-gray-400">最佳成绩</p>
                        <p className="font-bold text-pink-500">{entry.bestRounds} 轮</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* 4-10名 */}
            {data?.leaderboard.slice(3, 10).map((entry) => (
              <Card
                key={entry.userId}
                className={`border ${getRankStyle(entry.rank + 1)} transition-all hover:scale-[1.01]`}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                      {getRankIcon(entry.rank)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">
                        {entry.username || "匿名用户"}
                      </p>
                      <p className="text-xs text-gray-500">
                        🏆 {entry.totalSuccess || 0} 次 · 📊 {entry.winRate}%
                      </p>
                    </div>
                    {entry.bestRounds && (
                      <p className="text-sm font-medium text-pink-500">
                        {entry.bestRounds} 轮
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* 11名以后 */}
            {data?.leaderboard.slice(10).map((entry) => (
              <Card
                key={entry.userId}
                className="border-gray-200 transition-all hover:bg-gray-50"
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm">
                      #{entry.rank}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-700">
                        {entry.username || "匿名用户"}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium text-gray-700">{entry.totalSuccess || 0} 次成功</p>
                      <p className="text-xs text-gray-400">{entry.winRate}% 胜率</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 底部提示 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400">
            💡 完成更多场景可以获得更高排名
          </p>
        </div>
      </div>
    </div>
  );
}
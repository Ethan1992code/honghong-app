"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, ArrowRight, Star, Sparkles, HeartHandshake, LogOut, User, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Scenario {
  id: number;
  title: string;
  description: string;
  emotion_level: number;
  category: string;
}

interface UserInfo {
  id: number;
  username: string;
}

type Category = "girlfriend" | "boyfriend";

const emotionLabels = ["轻度", "一般", "中等", "较严重", "严重"];

export default function HomePage() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category>("girlfriend");
  const [user, setUser] = useState<UserInfo | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      });
      const data = await res.json();
      if (data.isLoggedIn && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
    } catch {
      // ignore
    }
  };

  const fetchScenarios = async (cat: Category) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/scenarios?category=${cat}`);
      const data = await res.json();
      setScenarios(data.scenarios || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    fetchScenarios(category);
  }, [category]);

  const startScenario = (id: number) => {
    router.push(`/play/${id}`);
  };

  const isGirlfriend = category === "girlfriend";

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {/* 用户状态栏 */}
      <div className="mb-4 flex items-center justify-between">
        {checkingAuth ? (
          <Skeleton className="h-8 w-24" />
        ) : user ? (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="h-4 w-4" />
            <span>{user.username}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">登录后可保存进度</span>
        )}
        {user ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700"
            onClick={handleLogout}
          >
            <LogOut className="mr-1 h-4 w-4" />
            退出
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-green-500 hover:text-green-600"
              onClick={() => router.push("/login")}
            >
              登录
            </Button>
            <Button
              size="sm"
              className="bg-green-500 hover:bg-green-600"
              onClick={() => router.push("/register")}
            >
              注册
            </Button>
          </div>
        )}
      </div>

      {/* 头部 */}
      <header className="mb-6 text-center">
        <div className={`mb-3 inline-flex items-center justify-center rounded-full p-3 ${
          "bg-green-100"
        }`}>
          <Heart className="h-8 w-8 text-green-500" fill="currentColor" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">哄哄模拟器</h1>
        <p className="mt-1 text-sm text-gray-500">
          选择模式，开始训练你的哄人能力
        </p>
      </header>

      {/* 性别切换 */}
      <div className="mb-6 grid grid-cols-2 gap-2">
        <Button
          variant={isGirlfriend ? "default" : "outline"}
          className={`rounded-full ${isGirlfriend ? "bg-green-500 hover:bg-green-600" : ""}`}
          onClick={() => setCategory("girlfriend")}
        >
          <Heart className="mr-1 h-4 w-4" fill={isGirlfriend ? "currentColor" : "none"} />
          哄女友
        </Button>
        <Button
          variant={!isGirlfriend ? "default" : "outline"}
          className={`rounded-full ${!isGirlfriend ? "bg-green-500 hover:bg-green-600" : ""}`}
          onClick={() => setCategory("boyfriend")}
        >
          <HeartHandshake className="mr-1 h-4 w-4" />
          哄男友
        </Button>
      </div>

      {/* 导航 */}
      <div className="mb-6 grid grid-cols-3 gap-2">
        <Button variant="default" className={`rounded-full bg-green-500 hover:bg-green-600`} disabled>
          <Sparkles className="mr-1 h-4 w-4" />
          场景练习
        </Button>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => router.push("/progress")}
        >
          <Star className="mr-1 h-4 w-4" />
          成长记录
        </Button>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => router.push("/leaderboard")}
        >
          <Trophy className="mr-1 h-4 w-4" />
          排行榜
        </Button>
      </div>

      {/* 场景列表 */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {scenarios.map((scenario) => (
            <Card
              key={scenario.id}
              className={`cursor-pointer overflow-hidden transition-all hover:shadow-md ${
                "border-green-100 hover:border-green-300"
              }`}
              onClick={() => startScenario(scenario.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="font-semibold text-gray-800">{scenario.title}</h3>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${
                          scenario.emotion_level >= 4
                            ? "bg-red-100 text-red-600"
                            : scenario.emotion_level >= 3
                              ? "bg-orange-100 text-orange-600"
                              : "bg-yellow-100 text-yellow-600"
                        }`}
                      >
                        {emotionLabels[scenario.emotion_level - 1]}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">{scenario.description}</p>
                  </div>
                  <div className={`ml-3 flex h-10 w-10 items-center justify-center rounded-full ${
                    "bg-green-50"
                  }`}>
                    <ArrowRight className={`h-5 w-5 text-green-400`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && scenarios.length === 0 && (
        <p className="py-12 text-center text-sm text-gray-400">
          暂无相关场景
        </p>
      )}
    </div>
  );
}
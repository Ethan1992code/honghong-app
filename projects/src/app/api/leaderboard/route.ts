import { NextResponse } from "next/server";
import { db } from "@/storage/database/drizzle-client";
import { progressRecords, scenarios, users } from "@/storage/database/shared/schema";
import { desc, eq, sql, count } from "drizzle-orm";

export async function GET() {
  try {
    // 获取排行榜数据：按成功次数排序
    // 注意：userId 是 varchar 类型，id 是 integer 类型，需要转换
    const leaderboardData = await db
      .select({
        userId: progressRecords.userId,
        username: users.username,
        totalSuccess: sql`SUM(${progressRecords.successCount})`.as("total_success"),
        totalAttempts: sql`SUM(${progressRecords.totalAttempts})`.as("total_attempts"),
        completedScenarios: sql`COUNT(DISTINCT ${progressRecords.scenarioId})`.as("completed_scenarios"),
        bestRounds: sql`MIN(${progressRecords.bestRounds})`.as("best_rounds"),
      })
      .from(progressRecords)
      .leftJoin(users, eq(users.id, sql`CAST(${progressRecords.userId} AS INTEGER)`))
      .groupBy(progressRecords.userId, users.username)
      .orderBy(desc(sql`total_success`))
      .limit(50)
      .execute();

    // 获取我的排名
    const myRank = leaderboardData.findIndex((_, index) => index >= 0) + 1;

    // 获取总用户数
    const totalUsersResult = await db
      .select({ count: count() })
      .from(users)
      .execute();
    const totalUsers = totalUsersResult[0]?.count || 0;

    // 获取场景总数
    const totalScenariosResult = await db
      .select({ count: count() })
      .from(scenarios)
      .execute();
    const totalScenarios = totalScenariosResult[0]?.count || 0;

    return NextResponse.json({
      leaderboard: leaderboardData.map((item, index) => ({
        ...item,
        rank: index + 1,
        winRate: item.totalAttempts > 0 
          ? Math.round((Number(item.totalSuccess) / Number(item.totalAttempts)) * 100) 
          : 0,
      })),
      totalUsers,
      totalScenarios,
    });
  } catch (error) {
    console.error("获取排行榜失败:", error);
    return NextResponse.json({ error: "获取排行榜失败" }, { status: 500 });
  }
}
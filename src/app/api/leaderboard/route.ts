import { NextResponse } from "next/server";
import { db } from "@/storage/database/drizzle-client";
import { progressRecords, scenarios, users } from "@/storage/database/shared/schema";
import { desc, eq, sql, count } from "drizzle-orm";

export async function GET() {
  if (!db) {
    return NextResponse.json({
      leaderboard: [],
      myRank: null,
      totalUsers: 0,
      totalScenarios: 8,
    });
  }

  try {
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

    const totalUsersResult = await db
      .select({ count: count() })
      .from(users)
      .execute();
    const totalUsers = totalUsersResult[0]?.count || 0;

    const totalScenariosResult = await db
      .select({ count: count() })
      .from(scenarios)
      .execute();
    const totalScenarios = totalScenariosResult[0]?.count || 0;

    return NextResponse.json({
      leaderboard: leaderboardData.map((item, index) => ({
        ...item,
        rank: index + 1,
        winRate: Number(item.totalAttempts) > 0 
          ? Math.round((Number(item.totalSuccess) / Number(item.totalAttempts)) * 100) 
          : 0,
      })),
      myRank: null,
      totalUsers,
      totalScenarios,
    });
  } catch (error) {
    console.error('[Leaderboard] Error:', error);
    return NextResponse.json({
      leaderboard: [],
      myRank: null,
      totalUsers: 0,
      totalScenarios: 8,
    });
  }
}
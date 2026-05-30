import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getSession } from "@/lib/session";

// GET /api/progress - 获取用户进度
export async function GET() {
  // 从 session 获取当前用户
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const userId = session.userId;

  const client = getSupabaseClient();

  // 获取每个场景的进度
  const { data: records, error } = await client
    .from("progress_records")
    .select("*, scenarios!inner(id, title)")
    .eq("user_id", userId);

  if (error) {
    // 如果没有记录，返回空
    return NextResponse.json({ progress: [], summary: getEmptySummary() });
  }

  // 获取完成的会话轮次数据用于进步曲线
  const { data: completedSessions } = await client
    .from("sessions")
    .select("scenario_id, rounds_count, created_at")
    .eq("user_id", userId)
    .eq("status", "success")
    .order("created_at", { ascending: true });

  const summary = {
    total_success: records.reduce((s: number, r: any) => s + (r.success_count || 0), 0),
    total_attempts: records.reduce((s: number, r: any) => s + (r.total_attempts || 0), 0),
    completed_scenarios: records.filter((r: any) => r.success_count > 0).length,
    total_scenarios: 8,
  };

  return NextResponse.json({
    progress: records,
    sessions: completedSessions || [],
    summary,
  });
}

function getEmptySummary() {
  return {
    total_success: 0,
    total_attempts: 0,
    completed_scenarios: 0,
    total_scenarios: 8,
  };
}
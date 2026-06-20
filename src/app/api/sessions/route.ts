import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");

  if (!userId) {
    return NextResponse.json({ error: "缺少 user_id" }, { status: 400 });
  }

  const client = getSupabaseClient();
  
  if (!client) {
    return NextResponse.json({ sessions: [] });
  }

  const { data, error } = await client
    .from("sessions")
    .select("id, scenario_id, current_stage, status, rounds_count, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "获取会话列表失败" }, { status: 500 });
  }

  return NextResponse.json({ sessions: data });
}
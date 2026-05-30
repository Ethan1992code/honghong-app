import { NextRequest, NextResponse } from "next/server";
import { db } from "@/storage/database/drizzle-client";
import { scenarios } from "@/storage/database/shared/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  let query = db
    .select({
      id: scenarios.id,
      title: scenarios.title,
      description: scenarios.description,
      emotionLevel: scenarios.emotionLevel,
      stageConfig: scenarios.stageConfig,
      category: scenarios.category,
    })
    .from(scenarios)
    .orderBy(asc(scenarios.id));

  if (category) {
    query = query.where(eq(scenarios.category, category));
  }

  const data = await query.execute();

  return NextResponse.json({ scenarios: data });
}
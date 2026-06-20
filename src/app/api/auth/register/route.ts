import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getSession } from "@/lib/session";
import { db } from "@/storage/database/drizzle-client";
import { users } from "@/storage/database/shared/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json(
      { error: "服务暂不可用，请稍后再试" },
      { status: 503 }
    );
  }

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    if (username.length < 2 || username.length > 20) {
      return NextResponse.json(
        { error: "用户名长度需要在 2-20 个字符之间" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "密码长度至少 6 个字符" },
        { status: 400 }
      );
    }

    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .execute()
      .then((res) => res[0]);

    if (existingUser) {
      return NextResponse.json(
        { error: "用户名已被注册" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const maxIdResult = await db
      .select({ maxId: sql<number>`MAX(id)` })
      .from(users)
      .execute();
    const maxId = maxIdResult[0]?.maxId || 0;
    const newId = Number(maxId) + 1;

    const newUserResult = await db
      .insert(users)
      .values({
        id: newId,
        username,
        password: hashedPassword,
      })
      .returning({ id: users.id, username: users.username })
      .execute();

    const newUser = newUserResult[0];

    const session = await getSession();
    session.userId = newUser.id;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({ success: true, user: { id: newUser.id, username: newUser.username } });
  } catch (error) {
    console.error('[Register] Error:', error);
    return NextResponse.json(
      { error: "注册失败，请稍后再试" },
      { status: 500 }
    );
  }
}
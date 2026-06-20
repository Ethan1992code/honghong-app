import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getSession } from "@/lib/session";
import { db } from "@/storage/database/drizzle-client";
import { users } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";

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

    const userResult = await db
      .select({ id: users.id, username: users.username, password: users.password })
      .from(users)
      .where(eq(users.username, username))
      .execute();

    const user = userResult[0];

    if (!user) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    const session = await getSession();
    session.userId = user.id;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({ success: true, user: { id: user.id, username: user.username } });
  } catch (error) {
    console.error('[Login] Error:', error);
    return NextResponse.json(
      { error: "登录失败，请稍后再试" },
      { status: 500 }
    );
  }
}
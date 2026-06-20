import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getSession } from "@/lib/session";
import { db } from "@/storage/database/drizzle-client";
import { users } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    console.log('[Login] Attempting login for username:', username);

    if (!username || !password) {
      console.log('[Login] Missing credentials');
      return NextResponse.json(
        { error: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    // 查找用户
    console.log('[Login] Querying database for user...');
    const userResult = await db
      .select({ id: users.id, username: users.username, password: users.password })
      .from(users)
      .where(eq(users.username, username))
      .execute();

    console.log('[Login] Database query result:', userResult);

    const user = userResult[0];

    if (!user) {
      console.log('[Login] User not found');
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    console.log('[Login] User found, validating password...');

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password);
    console.log('[Login] Password validation result:', isValid);

    if (!isValid) {
      console.log('[Login] Password invalid');
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    // 设置 session
    console.log('[Login] Setting up session...');
    const session = await getSession();
    session.userId = user.id;
    session.username = user.username;
    session.isLoggedIn = true;
    await session.save();

    console.log('[Login] Login successful!');
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("[Login] Error:", error);
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    );
  }
}

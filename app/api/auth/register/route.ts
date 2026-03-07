import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword, createSession, getSessionCookieOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, email, password, displayName } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json({ error: "Username, email and password required" }, { status: 400 });
    }

    if (username.length < 3 || username.length > 30) {
      return NextResponse.json({ error: "Username must be 3–30 characters" }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: "Username can only contain letters, numbers, and underscores" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const db = getDb();

    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE username = ? OR email = ?",
      args: [username.toLowerCase(), email.toLowerCase()],
    });

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "Username or email already taken" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const result = await db.execute({
      sql: `INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)`,
      args: [username.toLowerCase(), email.toLowerCase(), passwordHash, displayName || username],
    });

    const userId = Number(result.lastInsertRowid);
    const token = await createSession({ userId, username: username.toLowerCase(), email: email.toLowerCase() });

    const cookieOpts = getSessionCookieOptions();
    const response = NextResponse.json({ success: true, username: username.toLowerCase() });
    response.cookies.set(cookieOpts.name, token, cookieOpts);

    return response;
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, initializeDb } from "@/lib/db";

let dbInitialized = false;

export async function GET() {
  // Auto-initialize DB on first request (creates tables if they don't exist)
  if (!dbInitialized) {
    try {
      await initializeDb();
      dbInitialized = true;
    } catch (err) {
      console.error("DB init error:", err);
    }
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const db = getDb();
  const result = await db.execute({
    sql: `SELECT id, username, email, display_name, bio, bodyweight_lbs,
            max_rope_grade, max_boulder_grade, target_rope_grade, target_boulder_grade,
            avatar_url, role, is_admin, created_at
          FROM users WHERE id = ?`,
    args: [session.userId],
  });

  if (result.rows.length === 0) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user: result.rows[0] });
}

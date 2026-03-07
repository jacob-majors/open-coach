import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();

  // Get activity from people you follow + yourself
  const result = await db.execute({
    sql: `SELECT a.*, u.username, u.display_name
          FROM activity a
          JOIN users u ON a.user_id = u.id
          WHERE a.user_id = ?
            OR a.user_id IN (
              SELECT following_id FROM followers WHERE follower_id = ?
            )
          ORDER BY a.created_at DESC LIMIT 30`,
    args: [session.userId, session.userId],
  });

  return NextResponse.json({ activity: result.rows });
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId: targetId } = await req.json();
  if (!targetId || targetId === session.userId) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  const db = getDb();

  const existing = await db.execute({
    sql: `SELECT 1 FROM followers WHERE follower_id = ? AND following_id = ?`,
    args: [session.userId, targetId],
  });

  if (existing.rows.length > 0) {
    // Unfollow
    await db.execute({
      sql: `DELETE FROM followers WHERE follower_id = ? AND following_id = ?`,
      args: [session.userId, targetId],
    });
    return NextResponse.json({ following: false });
  }

  // Follow
  await db.execute({
    sql: `INSERT INTO followers (follower_id, following_id) VALUES (?, ?)`,
    args: [session.userId, targetId],
  });

  return NextResponse.json({ following: true });
}

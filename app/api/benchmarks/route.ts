import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

async function isCoachOrAdmin(userId: number) {
  const db = getDb();
  const me = await db.execute({ sql: `SELECT role, is_admin FROM users WHERE id = ?`, args: [userId] });
  const row = me.rows[0];
  return row && (row.role === "coach" || row.role === "admin" || row.is_admin);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get("userId");

  const coach = await isCoachOrAdmin(session.userId);
  const targetId = (coach && userIdParam) ? parseInt(userIdParam) : session.userId;

  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM benchmarks WHERE user_id = ? ORDER BY recorded_at DESC`,
    args: [targetId],
  });
  return NextResponse.json({ benchmarks: result.rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { type, value, notes, userId } = await req.json();
  if (!type || value == null) return NextResponse.json({ error: "Type and value required" }, { status: 400 });

  const coach = await isCoachOrAdmin(session.userId);
  const targetId = (coach && userId) ? userId : session.userId;

  const db = getDb();
  const result = await db.execute({
    sql: `INSERT INTO benchmarks (user_id, type, value, notes) VALUES (?, ?, ?, ?)`,
    args: [targetId, type, value, notes || null],
  });
  return NextResponse.json({ id: Number(result.lastInsertRowid) });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  const coach = await isCoachOrAdmin(session.userId);
  const db = getDb();
  if (coach) {
    await db.execute({ sql: `DELETE FROM benchmarks WHERE id = ?`, args: [id] });
  } else {
    await db.execute({ sql: `DELETE FROM benchmarks WHERE id = ? AND user_id = ?`, args: [id, session.userId] });
  }
  return NextResponse.json({ success: true });
}

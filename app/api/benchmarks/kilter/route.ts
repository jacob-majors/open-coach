import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

async function requireCoach(userId: number) {
  const db = getDb();
  const me = await db.execute({ sql: `SELECT role, is_admin FROM users WHERE id = ?`, args: [userId] });
  const row = me.rows[0];
  return !!(row && (row.role === "coach" || row.role === "admin" || row.is_admin));
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireCoach(session.userId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const athleteId = searchParams.get("athleteId");
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT kb.*, u.display_name as coach_name
          FROM kilter_benchmarks kb
          JOIN users u ON kb.coach_id = u.id
          WHERE kb.athlete_id = ?
          ORDER BY kb.created_at DESC`,
    args: [athleteId ? parseInt(athleteId) : 0],
  });
  return NextResponse.json({ benchmarks: result.rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireCoach(session.userId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { athleteId, climbName, grade, angle, notes } = await req.json();
  if (!athleteId || !climbName) return NextResponse.json({ error: "athleteId and climbName required" }, { status: 400 });

  const db = getDb();
  const result = await db.execute({
    sql: `INSERT INTO kilter_benchmarks (athlete_id, coach_id, climb_name, grade, angle, notes) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [athleteId, session.userId, climbName, grade || null, angle || null, notes || null],
  });
  return NextResponse.json({ success: true, id: Number(result.lastInsertRowid) });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireCoach(session.userId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, isCompleted } = await req.json();
  const db = getDb();
  await db.execute({
    sql: `UPDATE kilter_benchmarks SET is_completed = ? WHERE id = ?`,
    args: [isCompleted ? 1 : 0, id],
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireCoach(session.userId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  const db = getDb();
  await db.execute({ sql: `DELETE FROM kilter_benchmarks WHERE id = ?`, args: [id] });
  return NextResponse.json({ success: true });
}

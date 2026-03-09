import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

async function requireCoach(session: { userId: number }) {
  const db = getDb();
  const me = await db.execute({ sql: `SELECT role, is_admin FROM users WHERE id = ?`, args: [session.userId] });
  const row = me.rows[0];
  return row && (row.role === "coach" || row.role === "admin" || row.is_admin);
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT pp.*, u.display_name as coach_name, u.username as coach_username
          FROM practice_plans pp
          JOIN users u ON pp.coach_id = u.id
          ORDER BY pp.created_at DESC
          LIMIT 50`,
    args: [],
  });
  return NextResponse.json({ plans: result.rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireCoach(session))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { sessionName, dayType, warmupId, blocks, cooldown, coachNotes, practiceDate, teamFilter, totalMinutes } = await req.json();
  const db = getDb();
  const result = await db.execute({
    sql: `INSERT INTO practice_plans (coach_id, session_name, day_type, warmup_id, blocks, cooldown, coach_notes, practice_date, team_filter, total_minutes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [session.userId, sessionName || null, dayType, warmupId || null, JSON.stringify(blocks || []), cooldown || null, coachNotes || null, practiceDate || null, teamFilter || null, totalMinutes || 0],
  });
  return NextResponse.json({ success: true, id: Number(result.lastInsertRowid) });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireCoach(session))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json();
  const db = getDb();
  await db.execute({ sql: `DELETE FROM practice_plans WHERE id = ? AND coach_id = ?`, args: [id, session.userId] });
  return NextResponse.json({ success: true });
}

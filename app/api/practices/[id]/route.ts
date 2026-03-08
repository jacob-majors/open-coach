import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

async function requireCoach(session: { userId: number }) {
  const db = getDb();
  const me = await db.execute({
    sql: `SELECT role, is_admin FROM users WHERE id = ?`,
    args: [session.userId],
  });
  const row = me.rows[0];
  return row && (row.role === "coach" || row.role === "admin" || row.is_admin);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireCoach(session))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { title, compTeam, practiceDate, startTime, durationMinutes, location, notes, planId, coachId } = body;

  const db = getDb();
  await db.execute({
    sql: `UPDATE practices SET
            title = COALESCE(?, title),
            comp_team = ?,
            practice_date = COALESCE(?, practice_date),
            start_time = ?,
            duration_minutes = COALESCE(?, duration_minutes),
            location = ?,
            notes = ?,
            plan_id = ?,
            coach_id = ?
          WHERE id = ?`,
    args: [
      title || null, compTeam ?? null, practiceDate || null,
      startTime ?? null, durationMinutes || null,
      location ?? null, notes ?? null, planId ?? null, coachId ?? null,
      parseInt(id),
    ],
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireCoach(session))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  // Check if this is a parent of recurring practices
  const { searchParams } = new URL(req.url);
  const deleteAll = searchParams.get("deleteAll") === "true";

  if (deleteAll) {
    // Delete this and all children
    await db.execute({ sql: `DELETE FROM practices WHERE parent_practice_id = ?`, args: [parseInt(id)] });
  }
  await db.execute({ sql: `DELETE FROM practices WHERE id = ?`, args: [parseInt(id)] });

  return NextResponse.json({ success: true });
}

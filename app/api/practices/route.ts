import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const team = searchParams.get("team");
  const from = searchParams.get("from") || new Date().toISOString().slice(0, 10);

  const result = await db.execute({
    sql: `SELECT p.id, p.title, p.comp_team, p.practice_date, p.start_time,
                 p.duration_minutes, p.location, p.notes, p.is_recurring,
                 p.recurrence_rule, p.recurrence_end_date, p.parent_practice_id,
                 p.plan_id, p.created_by,
                 u.id as coach_id, u.display_name as coach_name, u.username as coach_username,
                 pp.id as practice_plan_id, pp.session_name, pp.day_type, pp.warmup_id,
                 pp.blocks, pp.cooldown, pp.coach_notes as plan_coach_notes, pp.total_minutes as plan_total_minutes
          FROM practices p
          LEFT JOIN users u ON p.coach_id = u.id
          LEFT JOIN practice_plans pp ON pp.practice_id = p.id
          WHERE p.practice_date >= ?
          ${team && team !== "all" ? "AND (p.comp_team = ? OR p.comp_team IS NULL)" : ""}
          ORDER BY p.practice_date ASC, p.start_time ASC
          LIMIT 60`,
    args: team && team !== "all" ? [from, parseInt(team)] : [from],
  });

  // Fetch coaches for assignment UI
  const coaches = await db.execute({
    sql: `SELECT id, username, display_name FROM users WHERE role = 'coach' OR role = 'admin' ORDER BY display_name ASC`,
    args: [],
  });

  return NextResponse.json({ practices: result.rows, coaches: coaches.rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const me = await db.execute({
    sql: `SELECT role, is_admin FROM users WHERE id = ?`,
    args: [session.userId],
  });
  const myRole = me.rows[0];
  if (!myRole || (myRole.role !== "coach" && myRole.role !== "admin" && !myRole.is_admin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    title, compTeam, practiceDate, startTime, durationMinutes,
    location, notes, planId, coachId, isRecurring, recurrenceRule, recurrenceEndDate,
  } = body;

  if (!title || !practiceDate) {
    return NextResponse.json({ error: "title and practiceDate required" }, { status: 400 });
  }

  // Create the base practice
  const result = await db.execute({
    sql: `INSERT INTO practices (title, comp_team, practice_date, start_time, duration_minutes,
            location, notes, plan_id, coach_id, is_recurring, recurrence_rule, recurrence_end_date, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      title,
      compTeam || null,
      practiceDate,
      startTime || null,
      durationMinutes || 90,
      location || null,
      notes || null,
      planId || null,
      coachId || null,
      isRecurring ? 1 : 0,
      recurrenceRule || null,
      recurrenceEndDate || null,
      session.userId,
    ],
  });

  const parentId = Number(result.lastInsertRowid);

  // Generate recurring instances
  if (isRecurring && recurrenceRule && recurrenceEndDate) {
    const intervalDays = recurrenceRule === "weekly" ? 7 : recurrenceRule === "biweekly" ? 14 : null;
    if (intervalDays) {
      const endDate = new Date(recurrenceEndDate);
      let current = new Date(practiceDate);
      current.setDate(current.getDate() + intervalDays);

      while (current <= endDate) {
        const dateStr = current.toISOString().slice(0, 10);
        await db.execute({
          sql: `INSERT INTO practices (title, comp_team, practice_date, start_time, duration_minutes,
                  location, notes, plan_id, coach_id, is_recurring, recurrence_rule,
                  recurrence_end_date, parent_practice_id, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
          args: [
            title, compTeam || null, dateStr, startTime || null,
            durationMinutes || 90, location || null, notes || null,
            planId || null, coachId || null, recurrenceRule,
            recurrenceEndDate, parentId, session.userId,
          ],
        });
        current.setDate(current.getDate() + intervalDays);
      }
    }
  }

  return NextResponse.json({ success: true, id: parentId });
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "20");

  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM logs WHERE user_id = ? ORDER BY completed_at DESC LIMIT ?`,
    args: [session.userId, limit],
  });

  return NextResponse.json({ logs: result.rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workoutId, workoutName, protocolType, weightLbs, rpe, notes, durationMinutes, setsCompleted, planId } =
    await req.json();

  if (!workoutName) return NextResponse.json({ error: "Workout name required" }, { status: 400 });

  const db = getDb();
  const result = await db.execute({
    sql: `INSERT INTO logs (user_id, workout_id, plan_id, workout_name, protocol_type, weight_lbs, rpe, notes, duration_minutes, sets_completed)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      session.userId,
      workoutId || null,
      planId || null,
      workoutName,
      protocolType || "custom",
      weightLbs || null,
      rpe || null,
      notes || null,
      durationMinutes || null,
      setsCompleted || null,
    ],
  });

  await db.execute({
    sql: `INSERT INTO activity (user_id, type, title, subtitle) VALUES (?, 'workout_logged', ?, ?)`,
    args: [session.userId, `Logged: ${workoutName}`, rpe ? `RPE ${rpe}` : null],
  });

  return NextResponse.json({ success: true, id: result.lastInsertRowid });
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Get active plan
  const activePlanResult = await db.execute({
    sql: `SELECT p.id, p.title, p.focus, p.duration_weeks, up.started_at
          FROM user_plans up JOIN plans p ON up.plan_id = p.id
          WHERE up.user_id = ? AND up.is_active = 1 LIMIT 1`,
    args: [session.userId],
  });

  if (activePlanResult.rows.length === 0) {
    return NextResponse.json({ plan: null, weeks: [] });
  }

  const plan = activePlanResult.rows[0];
  const startedAt = plan.started_at as string;
  const daysSinceStart = startedAt
    ? Math.floor((Date.now() - new Date(startedAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const currentWeek = Math.min(Math.floor(daysSinceStart / 7) + 1, plan.duration_weeks as number);
  const currentDayOfWeek = (daysSinceStart % 7) + 1;

  // Get all workouts for the plan
  const workoutsResult = await db.execute({
    sql: `SELECT * FROM workouts WHERE plan_id = ? ORDER BY week_number, day_of_week, order_index`,
    args: [plan.id],
  });

  // Get recent logs for this plan (to mark completed)
  const logsResult = await db.execute({
    sql: `SELECT workout_id, completed_at FROM logs
          WHERE user_id = ? AND plan_id = ?
          ORDER BY completed_at DESC`,
    args: [session.userId, plan.id],
  });

  const completedWorkoutIds = new Set(logsResult.rows.map((l) => l.workout_id));

  // Group workouts by week
  const weekMap: Record<number, Record<number, typeof workoutsResult.rows>> = {};
  for (const w of workoutsResult.rows) {
    const wk = w.week_number as number;
    const day = w.day_of_week as number;
    if (!weekMap[wk]) weekMap[wk] = {};
    if (!weekMap[wk][day]) weekMap[wk][day] = [];
    weekMap[wk][day].push(w);
  }

  const totalWeeks = plan.duration_weeks as number;
  const weeks = Array.from({ length: totalWeeks }, (_, i) => {
    const weekNum = i + 1;
    const days = Array.from({ length: 7 }, (_, j) => {
      const dayNum = j + 1;
      const dayWorkouts = (weekMap[weekNum]?.[dayNum] || []).map((w) => ({
        ...w,
        completed: completedWorkoutIds.has(w.id),
      }));
      return { day: dayNum, workouts: dayWorkouts };
    });
    return { week: weekNum, days, isCurrent: weekNum === currentWeek };
  });

  return NextResponse.json({
    plan,
    weeks,
    currentWeek,
    currentDayOfWeek,
    daysSinceStart,
  });
}

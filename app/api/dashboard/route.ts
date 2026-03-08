import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  const [user, recentLogs, latestTest, activePlan, recentTests, recentSends, benchmarks] = await Promise.all([
    db.execute({
      sql: `SELECT id, username, display_name, bodyweight_lbs, max_boulder_grade, target_boulder_grade
            FROM users WHERE id = ?`,
      args: [session.userId],
    }),
    db.execute({
      sql: `SELECT id, workout_name, protocol_type, weight_lbs, rpe, sets_completed, completed_at
            FROM logs WHERE user_id = ? ORDER BY completed_at DESC LIMIT 5`,
      args: [session.userId],
    }),
    db.execute({
      sql: `SELECT percent_bodyweight, total_weight_lbs, bodyweight_lbs, added_weight_lbs, tested_at
            FROM tests WHERE user_id = ? ORDER BY tested_at DESC LIMIT 1`,
      args: [session.userId],
    }),
    db.execute({
      sql: `SELECT p.id, p.title, p.focus, p.duration_weeks, up.started_at
            FROM user_plans up JOIN plans p ON up.plan_id = p.id
            WHERE up.user_id = ? AND up.is_active = 1 LIMIT 1`,
      args: [session.userId],
    }),
    db.execute({
      sql: `SELECT percent_bodyweight, tested_at FROM tests WHERE user_id = ?
            ORDER BY tested_at DESC LIMIT 12`,
      args: [session.userId],
    }),
    db.execute({
      sql: `SELECT grade, problem_name, location, style, notes, sent_at FROM sends
            WHERE user_id = ? ORDER BY sent_at DESC LIMIT 5`,
      args: [session.userId],
    }),
    db.execute({
      sql: `SELECT type, value, recorded_at FROM benchmarks WHERE user_id = ?
            ORDER BY recorded_at DESC`,
      args: [session.userId],
    }),
  ]);

  // Determine today's workout from active plan
  let todaysWorkout = null;
  if (activePlan.rows.length > 0) {
    const plan = activePlan.rows[0];
    const startedAt = plan.started_at as string;
    const daysSinceStart = startedAt
      ? Math.floor((Date.now() - new Date(startedAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const weekNumber = Math.floor(daysSinceStart / 7) + 1;
    const dayOfWeek = (daysSinceStart % 7) + 1;

    const workoutResult = await db.execute({
      sql: `SELECT * FROM workouts WHERE plan_id = ? AND week_number = ? AND day_of_week = ?
            ORDER BY order_index ASC`,
      args: [plan.id, Math.min(weekNumber, plan.duration_weeks as number), dayOfWeek],
    });

    if (workoutResult.rows.length > 0) {
      todaysWorkout = {
        plan,
        exercises: workoutResult.rows,
        weekNumber,
        dayOfWeek,
      };
    }
  }

  // Latest per benchmark type
  const benchmarkMap: Record<string, number> = {};
  for (const b of benchmarks.rows) {
    const t = b.type as string;
    if (!(t in benchmarkMap)) benchmarkMap[t] = b.value as number;
  }

  return NextResponse.json({
    user: user.rows[0] || null,
    todaysWorkout,
    recentLogs: recentLogs.rows,
    latestTest: latestTest.rows[0] || null,
    testHistory: recentTests.rows.reverse(),
    recentSends: recentSends.rows,
    benchmarks: benchmarkMap,
  });
}

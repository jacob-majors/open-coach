import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const focus = searchParams.get("focus");
  const difficulty = searchParams.get("difficulty");
  const mine = searchParams.get("mine") === "true";
  const certified = searchParams.get("certified") === "true";

  const db = getDb();
  const session = await getSession();

  let sql = `
    SELECT p.*, u.username as creator_username, u.display_name as creator_display_name,
      (SELECT COUNT(*) FROM workouts w WHERE w.plan_id = p.id) as workout_count,
      (SELECT COUNT(*) FROM user_plans up2 WHERE up2.plan_id = p.id) as save_count
      ${session ? `, (SELECT 1 FROM user_plans up3 WHERE up3.plan_id = p.id AND up3.user_id = ${session.userId}) as is_saved` : ""}
    FROM plans p
    JOIN users u ON p.creator_id = u.id
    WHERE 1=1
  `;

  const args: (string | number)[] = [];

  if (mine && session) {
    sql += ` AND p.creator_id = ?`;
    args.push(session.userId);
  } else {
    sql += ` AND p.is_public = 1`;
  }

  if (certified) {
    sql += ` AND p.is_certified = 1`;
  }

  if (focus && focus !== "all") {
    sql += ` AND p.focus = ?`;
    args.push(focus);
  }

  sql += ` ORDER BY p.is_certified DESC, p.created_at DESC LIMIT 50`;

  const result = await db.execute({ sql, args });
  return NextResponse.json({ plans: result.rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, difficultyMin, difficultyMax, durationWeeks, focus, isPublic, workouts } = body;

  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const db = getDb();

  const planResult = await db.execute({
    sql: `INSERT INTO plans (creator_id, title, description, difficulty_min, difficulty_max, duration_weeks, focus, is_public)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      session.userId,
      title,
      description || null,
      difficultyMin || null,
      difficultyMax || null,
      durationWeeks || 4,
      focus || "general",
      isPublic ? 1 : 0,
    ],
  });

  const planId = Number(planResult.lastInsertRowid);

  if (workouts && workouts.length > 0) {
    for (let i = 0; i < workouts.length; i++) {
      const w = workouts[i];
      await db.execute({
        sql: `INSERT INTO workouts (plan_id, name, protocol_type, description, purpose, instructions, form_cues,
                hang_time_s, rest_time_s, reps, sets, rest_between_sets_s, intensity_percent, day_of_week, week_number, order_index)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          planId,
          w.name,
          w.protocolType || "custom",
          w.description || null,
          w.purpose || null,
          w.instructions || null,
          w.formCues || null,
          w.hangTime || null,
          w.restTime || null,
          w.reps || null,
          w.sets || null,
          w.restBetweenSets || 180,
          w.intensityPercent || null,
          w.dayOfWeek || null,
          w.weekNumber || 1,
          i,
        ],
      });
    }
  }

  // Log activity if public
  if (isPublic) {
    await db.execute({
      sql: `INSERT INTO activity (user_id, type, title, subtitle)
            VALUES (?, 'plan_published', ?, ?)`,
      args: [session.userId, `Published plan: ${title}`, description || null],
    });
  }

  return NextResponse.json({ success: true, planId });
}

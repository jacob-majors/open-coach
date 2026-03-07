import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { runAssessment, generatePlanFromAssessment } from "@/lib/assessment";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { maxHangPercent, maxPullups, campusReachCm, verticalJumpCm, lSitHoldS, climbingGrade } = body;

  if (!maxHangPercent || !maxPullups || !climbingGrade) {
    return NextResponse.json({ error: "maxHangPercent, maxPullups, and climbingGrade are required" }, { status: 400 });
  }

  const result = runAssessment({
    maxHangPercent: parseFloat(maxHangPercent),
    maxPullups: parseInt(maxPullups),
    campusReachCm: campusReachCm ? parseFloat(campusReachCm) : undefined,
    verticalJumpCm: verticalJumpCm ? parseFloat(verticalJumpCm) : undefined,
    lSitHoldS: lSitHoldS ? parseFloat(lSitHoldS) : undefined,
    climbingGrade,
  });

  const db = getDb();

  // Generate a plan based on the results
  const planData = generatePlanFromAssessment(result);
  const planResult = await db.execute({
    sql: `INSERT INTO plans (creator_id, title, description, focus, duration_weeks, is_public)
          VALUES (?, ?, ?, ?, 4, 0)`,
    args: [session.userId, planData.title, planData.description, planData.focus],
  });
  const planId = Number(planResult.lastInsertRowid);

  for (let i = 0; i < planData.workouts.length; i++) {
    const w = planData.workouts[i];
    await db.execute({
      sql: `INSERT INTO workouts (plan_id, name, protocol_type, instructions, hang_time_s, rest_time_s, reps, sets, rest_between_sets_s, intensity_percent, week_number, day_of_week, order_index)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        planId, w.name, w.protocolType, w.instructions,
        w.hangTime, w.restTime, w.reps, w.sets,
        w.restBetweenSets, w.intensityPercent,
        w.weekNumber, w.dayOfWeek, i,
      ],
    });
  }

  // Save assessment
  await db.execute({
    sql: `INSERT INTO assessments (user_id, max_hang_percent, max_pullups, campus_reach_cm, vertical_jump_cm, l_sit_hold_s, climbing_grade, limiting_factor, recommendations, generated_plan_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      session.userId,
      maxHangPercent,
      maxPullups,
      campusReachCm || null,
      verticalJumpCm || null,
      lSitHoldS || null,
      climbingGrade,
      result.limitingFactor,
      JSON.stringify(result.recommendations),
      planId,
    ],
  });

  return NextResponse.json({ result, planId });
}

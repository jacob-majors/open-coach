import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();

  const [athletes, teamCounts, sessionsWithPlan] = await Promise.all([
    db.execute({
      sql: `SELECT COUNT(*) as count FROM users WHERE role = 'athlete' OR role IS NULL OR role = ''`,
      args: [],
    }),
    db.execute({
      sql: `SELECT comp_team, COUNT(*) as count FROM users
            WHERE comp_team IS NOT NULL
            GROUP BY comp_team`,
      args: [],
    }),
    db.execute({
      sql: `SELECT COUNT(*) as count FROM schedule_sessions WHERE plan_id IS NOT NULL`,
      args: [],
    }),
  ]);

  // Athletes per team
  const byTeam: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const row of teamCounts.rows) {
    const t = row.comp_team as number;
    if (t >= 1 && t <= 4) byTeam[t] = row.count as number;
  }

  return NextResponse.json({
    totalAthletes: athletes.rows[0]?.count ?? 0,
    byTeam,
    sessionsWithPlan: sessionsWithPlan.rows[0]?.count ?? 0,
  });
}

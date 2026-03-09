import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [athletes, teamCounts, upcomingPractices, recentActivity] = await Promise.all([
    db.execute({
      sql: `SELECT COUNT(*) as count FROM users
            WHERE (role = 'athlete' OR role IS NULL OR role = '')
              AND (is_admin IS NULL OR is_admin = 0)`,
      args: [],
    }),
    db.execute({
      sql: `SELECT comp_team, COUNT(*) as count FROM users
            WHERE comp_team IS NOT NULL
              AND (is_admin IS NULL OR is_admin = 0)
              AND (role IS NULL OR role != 'admin')
            GROUP BY comp_team`,
      args: [],
    }),
    db.execute({
      sql: `SELECT COUNT(*) as count FROM practices
            WHERE practice_date >= ? AND practice_date <= ?`,
      args: [today, nextWeek],
    }),
    db.execute({
      sql: `SELECT u.display_name, u.username, u.comp_team, u.max_boulder_grade,
                   (SELECT MAX(tested_at) FROM tests WHERE user_id = u.id) as last_test,
                   (SELECT COUNT(*) FROM logs WHERE user_id = u.id AND completed_at >= date('now', '-7 days')) as logs_this_week
            FROM users u
            WHERE (u.role = 'athlete' OR u.role IS NULL OR u.role = '')
              AND (u.is_admin IS NULL OR u.is_admin = 0)
            ORDER BY u.comp_team ASC, u.display_name ASC
            LIMIT 50`,
      args: [],
    }),
  ]);

  const byTeam: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const row of teamCounts.rows) {
    const t = row.comp_team as number;
    if (t >= 1 && t <= 4) byTeam[t] = row.count as number;
  }

  return NextResponse.json({
    totalAthletes: athletes.rows[0]?.count ?? 0,
    byTeam,
    upcomingPractices: upcomingPractices.rows[0]?.count ?? 0,
    athletes: recentActivity.rows,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tab = searchParams.get("tab") || "feed";

  const db = getDb();

  if (tab === "coaches") {
    // Coaches who have shared practice plans (team page / coach aid content)
    const coaches = await db.execute({
      sql: `SELECT u.id, u.username, u.display_name, u.bio, u.max_boulder_grade, u.avatar_url,
                   COUNT(p.id) as plan_count
            FROM users u
            LEFT JOIN plans p ON p.creator_id = u.id AND p.is_public = 1
            WHERE u.role = 'coach' AND (u.is_admin IS NULL OR u.is_admin = 0)
            GROUP BY u.id
            ORDER BY plan_count DESC, u.created_at DESC
            LIMIT 20`,
      args: [],
    });
    return NextResponse.json({ coaches: coaches.rows });
  }

  if (tab === "plans") {
    // Public shared plans
    const plans = await db.execute({
      sql: `SELECT p.id, p.title, p.description, p.focus, p.duration_weeks,
                   p.difficulty_min, p.difficulty_max, p.is_certified,
                   u.username as creator_username, u.display_name as creator_name
            FROM plans p
            JOIN users u ON p.creator_id = u.id
            WHERE p.is_public = 1
            ORDER BY p.created_at DESC
            LIMIT 30`,
      args: [],
    });
    return NextResponse.json({ plans: plans.rows });
  }

  // Feed: recent sends + tests from all users (public activity)
  const [sends, tests, athletes] = await Promise.all([
    db.execute({
      sql: `SELECT s.grade, s.problem_name, s.location, s.style, s.notes, s.sent_at,
                   u.username, u.display_name
            FROM sends s
            JOIN users u ON s.user_id = u.id
            ORDER BY s.sent_at DESC
            LIMIT 20`,
      args: [],
    }),
    db.execute({
      sql: `SELECT t.percent_bodyweight, t.added_weight_lbs, t.tested_at,
                   u.username, u.display_name
            FROM tests t
            JOIN users u ON t.user_id = u.id
            ORDER BY t.tested_at DESC
            LIMIT 10`,
      args: [],
    }),
    db.execute({
      sql: `SELECT id, username, display_name, bio, max_boulder_grade, role
            FROM users
            WHERE role = 'athlete' OR role IS NULL OR role = ''
            ORDER BY created_at DESC
            LIMIT 20`,
      args: [],
    }),
  ]);

  return NextResponse.json({
    sends: sends.rows,
    tests: tests.rows,
    athletes: athletes.rows,
  });
}

export async function PATCH(req: NextRequest) {
  // Update user role
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = await req.json();
  if (!["athlete", "coach"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const db = getDb();
  await db.execute({
    sql: `UPDATE users SET role = ? WHERE id = ?`,
    args: [role, session.userId],
  });

  return NextResponse.json({ success: true, role });
}

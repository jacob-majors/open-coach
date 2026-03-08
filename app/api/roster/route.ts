import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const result = await db.execute({
    sql: `SELECT id, username, display_name, email, bio, max_boulder_grade,
                 comp_team, role, created_at
          FROM users
          ORDER BY comp_team ASC NULLS LAST, display_name ASC`,
    args: [],
  });

  return NextResponse.json({ athletes: result.rows });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only coaches/admins can assign teams
  const db = getDb();
  const me = await db.execute({
    sql: `SELECT role, is_admin FROM users WHERE id = ?`,
    args: [session.userId],
  });
  const myRole = me.rows[0];
  if (!myRole || (myRole.role !== "coach" && myRole.role !== "admin" && !myRole.is_admin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, compTeam } = await req.json();
  await db.execute({
    sql: `UPDATE users SET comp_team = ? WHERE id = ?`,
    args: [compTeam ?? null, userId],
  });

  return NextResponse.json({ success: true });
}

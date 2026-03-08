import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";

async function requireCoach(session: { userId: number }) {
  const db = getDb();
  const me = await db.execute({
    sql: `SELECT role, is_admin FROM users WHERE id = ?`,
    args: [session.userId],
  });
  const row = me.rows[0];
  return row && (row.role === "coach" || row.role === "admin" || row.is_admin);
}

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

// Create one or more athletes manually (or bulk via CSV payload)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireCoach(session))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  // body can be { athletes: [{name, email, compTeam}] } or single { name, email, compTeam }
  const list: Array<{ name: string; email: string; bio?: string; compTeam?: number | null; role?: string }> = body.athletes
    ? body.athletes
    : [{ name: body.name, email: body.email, bio: body.bio, compTeam: body.compTeam, role: body.role }];

  const db = getDb();
  const created: string[] = [];
  const skipped: string[] = [];
  const defaultPassword = await bcrypt.hash("changeme123", 10);

  for (const athlete of list) {
    if (!athlete.email || !athlete.name) continue;
    const email = athlete.email.toLowerCase().trim();
    const username = email.split("@")[0].replace(/[^a-z0-9_]/gi, "").toLowerCase() || `athlete_${Date.now()}`;

    // Check if email already exists
    const existing = await db.execute({
      sql: `SELECT id FROM users WHERE email = ?`,
      args: [email],
    });
    if (existing.rows.length > 0) {
      skipped.push(email);
      continue;
    }

    // Find a unique username
    let finalUsername = username;
    let suffix = 1;
    while (true) {
      const u = await db.execute({ sql: `SELECT id FROM users WHERE username = ?`, args: [finalUsername] });
      if (u.rows.length === 0) break;
      finalUsername = `${username}${suffix++}`;
    }

    const userRole = athlete.role === "coach" ? "coach" : "athlete";
    await db.execute({
      sql: `INSERT INTO users (username, email, password_hash, display_name, bio, role, comp_team)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [finalUsername, email, defaultPassword, athlete.name.trim(), athlete.bio || null, userRole, athlete.compTeam ?? null],
    });
    created.push(email);
  }

  return NextResponse.json({ success: true, created, skipped });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireCoach(session))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  // Delete all users except the currently logged-in user
  const result = await db.execute({
    sql: `DELETE FROM users WHERE id != ?`,
    args: [session.userId],
  });

  return NextResponse.json({ success: true, deleted: Number(result.rowsAffected) });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireCoach(session))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { userId, compTeam, displayName, bio, role } = body;
  const db = getDb();

  if (displayName !== undefined || bio !== undefined || role !== undefined) {
    // Full edit (admin)
    await db.execute({
      sql: `UPDATE users SET
              display_name = COALESCE(?, display_name),
              bio = CASE WHEN ? IS NOT NULL THEN ? ELSE bio END,
              role = COALESCE(?, role),
              comp_team = CASE WHEN ? IS NOT NULL THEN ? ELSE comp_team END
            WHERE id = ?`,
      args: [
        displayName ?? null,
        bio ?? null, bio ?? null,
        role ?? null,
        compTeam ?? null, compTeam ?? null,
        userId,
      ],
    });
  } else {
    // Team-only update
    await db.execute({
      sql: `UPDATE users SET comp_team = ? WHERE id = ?`,
      args: [compTeam ?? null, userId],
    });
  }

  return NextResponse.json({ success: true });
}

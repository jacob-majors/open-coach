import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { getDb, initializeDb } from "@/lib/db";
import { createSession, getSessionCookieOptions } from "@/lib/auth";

let dbInitialized = false;

export async function POST(req: NextRequest) {
  const { idToken } = await req.json();
  if (!idToken) return NextResponse.json({ error: "ID token required" }, { status: 400 });

  // Verify with Firebase Admin
  const decoded = await verifyFirebaseToken(idToken);
  if (!decoded) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Init DB
  if (!dbInitialized) {
    await initializeDb();
    dbInitialized = true;
  }

  const db = getDb();
  const email = decoded.email || `${decoded.uid}@firebase.user`;
  const displayName = decoded.name || decoded.email?.split("@")[0] || "Climber";

  // Derive a username from email or name
  const baseUsername = (decoded.email?.split("@")[0] || decoded.name || "user")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 28);

  // Find or create user
  let user = await db.execute({
    sql: `SELECT id, username, email FROM users WHERE email = ?`,
    args: [email],
  });

  let userId: number;
  let username: string;

  const isAdmin = email === "jacobmajors2017@gmail.com";

  // Pre-assigned team mappings (email -> comp_team)
  const TEAM_ASSIGNMENTS: Record<string, number> = {
    "riomacdonald20119@gmail.com": 1,
  };
  const preAssignedTeam = TEAM_ASSIGNMENTS[email] ?? null;

  if (user.rows.length === 0) {
    // New user — find a unique username
    let finalUsername = baseUsername || "climber";
    const existing = await db.execute({
      sql: `SELECT username FROM users WHERE username LIKE ?`,
      args: [`${finalUsername}%`],
    });
    if (existing.rows.length > 0) {
      finalUsername = `${finalUsername}${Math.floor(Math.random() * 9000) + 1000}`;
    }

    // Create with a placeholder password hash (OAuth users don't use password login)
    const result = await db.execute({
      sql: `INSERT INTO users (username, email, password_hash, display_name, role, is_admin, comp_team)
            VALUES (?, ?, 'firebase-oauth', ?, ?, ?, ?)`,
      args: [finalUsername, email, displayName, isAdmin ? "admin" : "athlete", isAdmin ? 1 : 0, preAssignedTeam],
    });
    userId = Number(result.lastInsertRowid);
    username = finalUsername;
  } else {
    userId = user.rows[0].id as number;
    username = user.rows[0].username as string;
    // Ensure admin status is always up to date
    if (isAdmin) {
      await db.execute({
        sql: `UPDATE users SET role = 'admin', is_admin = 1 WHERE id = ?`,
        args: [userId],
      });
    }
    // Apply pre-assigned team if not already set
    if (preAssignedTeam !== null) {
      await db.execute({
        sql: `UPDATE users SET comp_team = ?, role = 'athlete' WHERE id = ? AND (comp_team IS NULL OR comp_team != ?)`,
        args: [preAssignedTeam, userId, preAssignedTeam],
      });
    }
  }

  // Create our session JWT
  const token = await createSession({ userId, username, email });
  const cookieOpts = getSessionCookieOptions();

  const response = NextResponse.json({ success: true, username });
  response.cookies.set(cookieOpts.name, token, cookieOpts);
  return response;
}

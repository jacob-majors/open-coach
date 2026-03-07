import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { activate } = await req.json().catch(() => ({ activate: false }));
  const db = getDb();
  const planId = parseInt(id);

  const existing = await db.execute({
    sql: `SELECT is_active FROM user_plans WHERE user_id = ? AND plan_id = ?`,
    args: [session.userId, planId],
  });

  if (existing.rows.length > 0) {
    if (activate) {
      // Deactivate all other plans first
      await db.execute({
        sql: `UPDATE user_plans SET is_active = 0 WHERE user_id = ?`,
        args: [session.userId],
      });
      await db.execute({
        sql: `UPDATE user_plans SET is_active = 1, started_at = datetime('now') WHERE user_id = ? AND plan_id = ?`,
        args: [session.userId, planId],
      });
    }
    return NextResponse.json({ success: true, saved: true });
  }

  // Deactivate other plans if activating
  if (activate) {
    await db.execute({
      sql: `UPDATE user_plans SET is_active = 0 WHERE user_id = ?`,
      args: [session.userId],
    });
  }

  await db.execute({
    sql: `INSERT INTO user_plans (user_id, plan_id, is_active, started_at)
          VALUES (?, ?, ?, ${activate ? "datetime('now')" : "NULL"})`,
    args: [session.userId, planId, activate ? 1 : 0],
  });

  // Activity log
  const plan = await db.execute({
    sql: `SELECT title FROM plans WHERE id = ?`,
    args: [planId],
  });

  await db.execute({
    sql: `INSERT INTO activity (user_id, type, title) VALUES (?, 'plan_saved', ?)`,
    args: [session.userId, `Saved plan: ${plan.rows[0]?.title}`],
  });

  return NextResponse.json({ success: true, saved: true, activated: activate });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  await db.execute({
    sql: `DELETE FROM user_plans WHERE user_id = ? AND plan_id = ?`,
    args: [session.userId, parseInt(id)],
  });

  return NextResponse.json({ success: true });
}

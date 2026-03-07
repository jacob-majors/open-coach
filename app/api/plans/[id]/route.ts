import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const session = await getSession();

  const planResult = await db.execute({
    sql: `SELECT p.*, u.username as creator_username, u.display_name as creator_display_name
          FROM plans p JOIN users u ON p.creator_id = u.id
          WHERE p.id = ? AND (p.is_public = 1 ${session ? `OR p.creator_id = ${session.userId}` : ""})`,
    args: [parseInt(id)],
  });

  if (planResult.rows.length === 0) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const workoutsResult = await db.execute({
    sql: `SELECT * FROM workouts WHERE plan_id = ? ORDER BY week_number ASC, day_of_week ASC, order_index ASC`,
    args: [parseInt(id)],
  });

  let isSaved = false;
  let isActive = false;
  if (session) {
    const savedResult = await db.execute({
      sql: `SELECT is_active FROM user_plans WHERE user_id = ? AND plan_id = ?`,
      args: [session.userId, parseInt(id)],
    });
    isSaved = savedResult.rows.length > 0;
    isActive = savedResult.rows[0]?.is_active === 1;
  }

  return NextResponse.json({
    plan: planResult.rows[0],
    workouts: workoutsResult.rows,
    isSaved,
    isActive,
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const plan = await db.execute({
    sql: `SELECT creator_id FROM plans WHERE id = ?`,
    args: [parseInt(id)],
  });

  if (plan.rows.length === 0 || plan.rows[0].creator_id !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.execute({ sql: `DELETE FROM plans WHERE id = ?`, args: [parseInt(id)] });
  return NextResponse.json({ success: true });
}

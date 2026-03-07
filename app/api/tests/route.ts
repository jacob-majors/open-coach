import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM tests WHERE user_id = ? ORDER BY tested_at DESC LIMIT 30`,
    args: [session.userId],
  });

  return NextResponse.json({ tests: result.rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bodyweightLbs, addedWeightLbs, edgeMm, hangTimeS, notes } = await req.json();

  if (!bodyweightLbs) {
    return NextResponse.json({ error: "Bodyweight required" }, { status: 400 });
  }

  const totalWeightLbs = bodyweightLbs + (addedWeightLbs || 0);
  const percentBodyweight = (totalWeightLbs / bodyweightLbs) * 100;

  const db = getDb();
  const result = await db.execute({
    sql: `INSERT INTO tests (user_id, edge_mm, bodyweight_lbs, added_weight_lbs, total_weight_lbs, percent_bodyweight, hang_time_s, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      session.userId,
      edgeMm || 20,
      bodyweightLbs,
      addedWeightLbs || 0,
      totalWeightLbs,
      percentBodyweight,
      hangTimeS || 10,
      notes || null,
    ],
  });

  // Update user bodyweight
  await db.execute({
    sql: `UPDATE users SET bodyweight_lbs = ? WHERE id = ?`,
    args: [bodyweightLbs, session.userId],
  });

  // Log activity
  await db.execute({
    sql: `INSERT INTO activity (user_id, type, title, subtitle)
          VALUES (?, 'test_recorded', ?, ?)`,
    args: [
      session.userId,
      `Recorded max hang test: ${Math.round(percentBodyweight)}% bodyweight`,
      `${Math.round(totalWeightLbs)} lbs total on ${edgeMm || 20}mm edge`,
    ],
  });

  return NextResponse.json({
    success: true,
    id: result.lastInsertRowid,
    percentBodyweight: Math.round(percentBodyweight * 10) / 10,
    totalWeightLbs,
  });
}

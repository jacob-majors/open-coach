import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM sends WHERE user_id = ? ORDER BY sent_at DESC LIMIT 50`,
    args: [session.userId],
  });
  return NextResponse.json({ sends: result.rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { grade, problemName, location, style, attempts, notes } = await req.json();
  if (!grade) return NextResponse.json({ error: "Grade required" }, { status: 400 });
  const db = getDb();
  const result = await db.execute({
    sql: `INSERT INTO sends (user_id, grade, problem_name, location, style, attempts, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [session.userId, grade, problemName || null, location || null, style || null, attempts || null, notes || null],
  });
  return NextResponse.json({ id: Number(result.lastInsertRowid) });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  const db = getDb();
  await db.execute({
    sql: `DELETE FROM sends WHERE id = ? AND user_id = ?`,
    args: [id, session.userId],
  });
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM benchmarks WHERE user_id = ? ORDER BY recorded_at DESC`,
    args: [session.userId],
  });
  return NextResponse.json({ benchmarks: result.rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { type, value, notes } = await req.json();
  if (!type || value == null) return NextResponse.json({ error: "Type and value required" }, { status: 400 });
  const db = getDb();
  const result = await db.execute({
    sql: `INSERT INTO benchmarks (user_id, type, value, notes) VALUES (?, ?, ?, ?)`,
    args: [session.userId, type, value, notes || null],
  });
  return NextResponse.json({ id: Number(result.lastInsertRowid) });
}

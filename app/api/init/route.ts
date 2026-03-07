import { NextResponse } from "next/server";
import { initializeDb } from "@/lib/db";

let initialized = false;

export async function GET() {
  if (!initialized) {
    await initializeDb();
    initialized = true;
  }
  return NextResponse.json({ ok: true });
}

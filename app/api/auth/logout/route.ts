import { NextResponse } from "next/server";
import { getSessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  const opts = getSessionCookieOptions();
  response.cookies.set(opts.name, "", { ...opts, maxAge: 0 });
  return response;
}

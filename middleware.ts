import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

const PUBLIC_PATHS = [
  "/auth/login",
  "/auth/register",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/plans",
  "/_next",
  "/favicon",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow public plan pages (GET only)
  if (pathname.startsWith("/plans") && req.method === "GET") {
    return NextResponse.next();
  }

  // Allow profile pages
  if (pathname.startsWith("/profile")) {
    return NextResponse.next();
  }

  // Allow assessment and dashboard (they redirect themselves if not authed)
  if (pathname === "/" || pathname === "/dashboard" || pathname.startsWith("/assessment")) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

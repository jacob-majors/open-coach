"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/plans",     label: "Plans" },
  { href: "/test",      label: "Test" },
  { href: "/log",       label: "Log" },
  { href: "/assessment",label: "Assess" },
  { href: "/ai",        label: "AI Coach" },
];

export default function Navigation() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  // Hide nav on timer page (fullscreen gym mode)
  if (pathname?.startsWith("/timer")) return null;

  return (
    <header className="sticky top-0 z-40 hidden md:block border-b border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center group">
          <img
            src="https://images.squarespace-cdn.com/content/v1/68954b21a7199d4b85be89c8/178ac0ce-b5b9-4913-aa0a-bdb22ebe2232/session-team-white.png?format=1500w"
            alt="Session Team"
            className="h-7 w-auto object-contain group-hover:opacity-80 transition"
          />
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || pathname?.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  active
                    ? "bg-brand-500/10 text-brand-400 font-medium"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-7 w-20 animate-pulse rounded bg-white/10" />
          ) : user ? (
            <>
              <Link
                href={`/profile/${user.username}`}
                className="text-sm text-white/60 hover:text-white transition"
              >
                @{user.username}
              </Link>
              <button onClick={logout} className="btn-ghost text-xs py-1.5">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="btn-ghost text-sm py-1.5">
                Sign in
              </Link>
              <Link href="/auth/register" className="btn-primary text-xs py-1.5 px-4">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

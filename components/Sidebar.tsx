"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useEffect, useState } from "react";
import { onAuthStateChange } from "@/lib/firebase";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (a: boolean) => (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <path d="M10 2L18 9V18H13V13H7V18H2V9L10 2Z"
          stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
          fill={a ? "currentColor" : "none"} fillOpacity={a ? 0.15 : 0}/>
      </svg>
    ),
  },
  {
    href: "/schedule",
    label: "Schedule",
    icon: (a: boolean) => (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"
          fill={a ? "currentColor" : "none"} fillOpacity={a ? 0.1 : 0}/>
        <path d="M7 2v3M13 2v3M3 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: "/plans",
    label: "Plans",
    icon: (a: boolean) => (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"
          fill={a ? "currentColor" : "none"} fillOpacity={a ? 0.1 : 0}/>
        <path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: "/test",
    label: "Test",
    icon: (_a: boolean) => (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <path d="M10 17V10M6 14V12M14 14V8M2 17h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: "/log",
    label: "Log",
    icon: (a: boolean) => (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"
          fill={a ? "currentColor" : "none"} fillOpacity={a ? 0.1 : 0}/>
        <path d="M10 7v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: "/assessment",
    label: "Assess",
    icon: (a: boolean) => (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <path d="M10 2a8 8 0 100 16A8 8 0 0010 2z" stroke="currentColor" strokeWidth="1.5"
          fill={a ? "currentColor" : "none"} fillOpacity={a ? 0.1 : 0}/>
        <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: "/ai",
    label: "AI Coach",
    icon: (a: boolean) => (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <path d="M17 10c0 3.866-3.134 7-7 7a6.98 6.98 0 01-4.03-1.27L3 17l1.27-2.97A6.98 6.98 0 013 10c0-3.866 3.134-7 7-7s7 3.134 7 7z"
          stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
          fill={a ? "currentColor" : "none"} fillOpacity={a ? 0.1 : 0}/>
      </svg>
    ),
  },
  {
    href: "/team",
    label: "Coach Aid",
    icon: (a: boolean) => (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"
          fill={a ? "currentColor" : "none"} fillOpacity={a ? 0.15 : 0}/>
        <circle cx="14" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M1 17c0-2.761 2.686-5 6-5s6 2.239 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M14 11c1.657 0 3 1.343 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    let unsub = () => {};
    onAuthStateChange((fbUser) => {
      setPhotoURL(fbUser?.photoURL ?? null);
      setDisplayName(fbUser?.displayName ?? null);
    }).then((fn) => { unsub = fn; });
    return () => unsub();
  }, []);

  if (pathname?.startsWith("/timer")) return null;

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-white/[0.06] bg-[#0d0d0d] sticky top-0 h-dvh overflow-y-auto">
      {/* Logo */}
      <div className="p-5 pb-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L14 12H2L8 2Z" fill="black"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none group-hover:text-brand-400 transition">
              Open Coach
            </p>
            <p className="text-[10px] text-white/30 mt-0.5">by Jacob Majors</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition group ${
                active
                  ? "bg-brand-500/10 text-brand-400 font-medium"
                  : "text-white/50 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              <span className={`shrink-0 transition ${active ? "text-brand-400" : "text-white/40 group-hover:text-white/80"}`}>
                {icon(active)}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 border-t border-white/[0.06] my-3" />

      {/* Bottom */}
      <div className="px-3 pb-5 space-y-1">
        <a
          href={process.env.NEXT_PUBLIC_SUPPORT_URL || "https://buymeacoffee.com/opencoach"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-yellow-400/60 hover:text-yellow-400 hover:bg-yellow-500/5 transition"
        >
          <span>☕</span>
          Support Open Coach
        </a>

        {loading ? (
          <div className="h-14 animate-pulse rounded-lg bg-white/[0.05]" />
        ) : user ? (
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <Link href={`/profile/${user.username}`} className="flex items-center gap-2.5 mb-2.5 group">
              {photoURL ? (
                <Image
                  src={photoURL}
                  alt={displayName || user.username}
                  width={28}
                  height={28}
                  className="rounded-full shrink-0 ring-1 ring-brand-500/30"
                  unoptimized
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold shrink-0">
                  {(displayName || user.username)[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                {displayName && (
                  <p className="text-xs font-semibold text-white truncate group-hover:text-brand-400 transition leading-tight">
                    {displayName.split(" ")[0]}
                  </p>
                )}
                <p className="text-[10px] text-white/40 truncate">@{user.username}</p>
              </div>
            </Link>
            <button
              onClick={logout}
              className="w-full text-left text-[11px] text-white/25 hover:text-white/50 transition"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/auth/login"
            className="flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-3 py-2.5 text-sm font-semibold text-black hover:bg-brand-400 transition"
          >
            Sign in with Google
          </Link>
        )}
      </div>
    </aside>
  );
}

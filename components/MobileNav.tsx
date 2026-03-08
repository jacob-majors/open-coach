"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

const STATIC_NAV = [
  {
    href: "/dashboard",
    label: "Today",
    icon: (
      <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
        <path d="M10 2L18 9V18H13V13H7V18H2V9L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: "/log",
    label: "Log",
    icon: (
      <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M7 7h6M7 10h6M7 13h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="15" cy="13" r="2.5" fill="currentColor" opacity="0" stroke="currentColor" strokeWidth="0"/>
      </svg>
    ),
  },
  {
    href: "/community",
    label: "Community",
    icon: (
      <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
        <circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="14" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M1 17c0-2.761 2.686-5 6-5s6 2.239 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M14 10.5c1.657 0 3 1.343 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: "/team",
    label: "Coach",
    icon: (
      <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="4" width="11" height="9" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M13 8l5-3v10l-5-3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M5 9h5M5 11h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (pathname?.startsWith("/timer")) return null;

  const profileHref = user ? `/profile/${user.username}` : "/auth/login";
  const profileActive = pathname?.startsWith("/profile");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-white/[0.06] bg-[#0a0a0a]/95 backdrop-blur-xl">
      <div className="flex items-center justify-around px-1 pb-safe pt-1">
        {STATIC_NAV.map(({ href, label, icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition ${
                active ? "text-brand-400" : "text-white/35 hover:text-white/60"
              }`}
            >
              {icon}
              <span className="text-[9px] font-semibold tracking-wide">{label}</span>
            </Link>
          );
        })}

        {/* Profile */}
        <Link
          href={profileHref}
          className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition ${
            profileActive ? "text-brand-400" : "text-white/35 hover:text-white/60"
          }`}
        >
          {user ? (
            <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-current/10 border border-current/30 text-[10px] font-bold">
              {user.username[0].toUpperCase()}
            </div>
          ) : (
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
          <span className="text-[9px] font-semibold tracking-wide">Profile</span>
        </Link>
      </div>
    </nav>
  );
}

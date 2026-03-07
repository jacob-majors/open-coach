"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const MOBILE_NAV = [
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
    href: "/schedule",
    label: "Schedule",
    icon: (
      <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M7 2v3M13 2v3M3 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: "/plans",
    label: "Plans",
    icon: (
      <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: "/test",
    label: "Test",
    icon: (
      <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
        <path d="M10 17V10M6 14V12M14 14V8M2 17h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: "/ai",
    label: "AI",
    icon: (
      <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
        <path d="M17 10c0 3.866-3.134 7-7 7a6.98 6.98 0 01-4.03-1.27L3 17l1.27-2.97A6.98 6.98 0 013 10c0-3.866 3.134-7 7-7s7 3.134 7 7z"
          stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

export default function MobileNav() {
  const pathname = usePathname();
  if (pathname?.startsWith("/timer")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-white/[0.06] bg-[#0a0a0a]/95 backdrop-blur-xl">
      <div className="flex items-center justify-around px-1 pb-safe pt-1">
        {MOBILE_NAV.map(({ href, label, icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-xl transition ${
                active ? "text-brand-400" : "text-white/35 hover:text-white/60"
              }`}
            >
              {icon}
              <span className="text-[9px] font-semibold tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

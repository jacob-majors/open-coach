"use client";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/timer")) return null;

  return (
    <footer className="hidden md:block border-t border-white/[0.06] bg-[#0a0a0a] mt-16">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <p className="text-xs text-white/30">
          Open Coach — Free climbing training, forever. Built by{" "}
          <span className="text-white/50">Jacob Majors</span>.
        </p>
        <a
          href={process.env.NEXT_PUBLIC_SUPPORT_URL || "https://buymeacoffee.com/opencoach"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs text-yellow-400 transition hover:bg-yellow-500/20"
        >
          <span>☕</span>
          Support Open Coach
        </a>
      </div>
    </footer>
  );
}

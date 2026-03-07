import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "Open Coach — Free Climbing Training Platform",
  description:
    "A free, open climbing training platform with structured workouts, finger strength tracking, and personalized training plans.",
  authors: [{ name: "Jacob Majors" }],
  keywords: ["climbing", "training", "hangboard", "finger strength", "bouldering", "sport climbing"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-dvh bg-[#0a0a0a] text-white antialiased">
        <div className="flex min-h-dvh">
          <Sidebar />
          <main className="flex-1 min-w-0 pb-20 md:pb-0">
            {children}
          </main>
        </div>
        <MobileNav />
      </body>
    </html>
  );
}

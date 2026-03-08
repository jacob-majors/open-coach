"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTimer } from "@/lib/hooks/useTimer";
import { formatTimerDisplay } from "@/lib/utils";
import type { WorkoutProtocol } from "@/types";

interface HangboardTimerProps {
  protocol: WorkoutProtocol;
  onComplete?: () => void;
  backHref?: string;
}

export default function HangboardTimer({ protocol, onComplete, backHref }: HangboardTimerProps) {
  const router = useRouter();
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  const { state, toggle, reset } = useTimer(protocol, {
    onComplete,
    enableAudio: audioEnabled,
    enableVibration: vibrationEnabled,
  });

  const isActive = state.phase !== "idle" && state.phase !== "complete";

  // Screen Wake Lock
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    if (state.phase !== "idle" && state.phase !== "complete") {
      navigator.wakeLock
        ?.request("screen")
        .then((lock) => { wakeLock = lock; })
        .catch(() => {});
    }
    return () => {
      wakeLock?.release().catch(() => {});
    };
  }, [state.phase]);

  // Fullscreen API (with webkit fallback for iOS Safari)
  const toggleFullscreen = useCallback(async () => {
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
    const doc = document as Document & { webkitExitFullscreen?: () => Promise<void>; webkitFullscreenElement?: Element };
    const inFullscreen = !!document.fullscreenElement || !!doc.webkitFullscreenElement;
    if (!inFullscreen) {
      await (el.requestFullscreen?.() || el.webkitRequestFullscreen?.())?.catch(() => {});
    } else {
      await (document.exitFullscreen?.() || doc.webkitExitFullscreen?.())?.catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      document.removeEventListener("webkitfullscreenchange", handler);
    };
  }, []);

  // Auto-fullscreen on mobile when timer starts
  useEffect(() => {
    if (state.phase === "hang" && !isFullscreen) {
      const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
      if (window.innerWidth < 768) {
        (el.requestFullscreen?.() || el.webkitRequestFullscreen?.())?.catch(() => {});
      }
    }
  }, [state.phase, isFullscreen]);

  const { phase, secondsLeft, currentRep, currentSet, totalReps, totalSets } = state;

  const colors = {
    idle: { bg: "bg-[#0a0a0a]", text: "text-white", label: "READY", labelColor: "text-white/40" },
    hang: { bg: "bg-[#0d1f14]", text: "text-brand-400", label: "HANG", labelColor: "text-brand-400" },
    rest: { bg: "bg-[#1a0a0a]", text: "text-red-400", label: "REST", labelColor: "text-red-400" },
    rest_between_sets: { bg: "bg-[#1a0a0a]", text: "text-orange-400", label: "SET REST", labelColor: "text-orange-400" },
    complete: { bg: "bg-[#0a0a0a]", text: "text-brand-400", label: "DONE", labelColor: "text-brand-400" },
  };

  const c = colors[phase];

  const totalTime =
    phase === "hang"
      ? protocol.hangTime
      : phase === "rest"
      ? protocol.restTime
      : phase === "rest_between_sets"
      ? protocol.restBetweenSets
      : 1;
  const progress = phase === "idle" || phase === "complete" ? 0 : ((totalTime - secondsLeft) / totalTime) * 100;

  const isCountdown = secondsLeft <= 3 && secondsLeft > 0 && phase !== "idle" && phase !== "complete";

  return (
    <div className={`flex flex-col min-h-dvh ${c.bg} transition-colors duration-300`}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-3 md:px-5"
        style={{ paddingTop: `max(env(safe-area-inset-top), 0.75rem)` }}
      >
        <div className="flex items-center gap-2 py-2 min-w-0">
          {backHref && (
            <button
              onClick={() => {
                if (isActive) { setShowBackConfirm(true); } else { router.push(backHref); }
              }}
              className="shrink-0 rounded-xl p-2 text-white/30 hover:text-white/70 transition active:scale-95"
            >
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                <path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white leading-tight truncate max-w-[180px] md:max-w-xs">
              {protocol.name}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-widest text-white/30 mt-0.5">
              {protocol.sets}×{protocol.reps} · {protocol.hangTime}s/{protocol.restTime}s
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAudioEnabled((v) => !v)}
            className={`rounded-xl p-2.5 transition ${audioEnabled ? "text-white/60 hover:text-white" : "text-white/20"}`}
            title="Toggle audio"
          >
            {audioEnabled ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7 7H3v6h4l5 4V3L7 7z" fill="currentColor"/>
                <path d="M15 7s2 1.5 2 3-2 3-2 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7 7H3v6h4l5 4V3L7 7z" fill="currentColor" opacity="0.3"/>
                <path d="M14 14l4-4M18 14l-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )}
          </button>
          <button
            onClick={toggleFullscreen}
            className="rounded-xl p-2.5 text-white/60 transition hover:text-white"
            title="Toggle fullscreen"
          >
            {isFullscreen ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7 3v4H3M17 3l-4 4M7 17v-4H3M17 17l-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 7V3h4M17 3h-4v4M3 13v4h4M17 17h-4v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/5">
        <div
          className="h-full transition-all duration-1000 ease-linear"
          style={{
            width: `${progress}%`,
            backgroundColor:
              phase === "hang" ? "#22c55e" : phase.includes("rest") ? "#f87171" : "#ffffff20",
          }}
        />
      </div>

      {/* Main timer display */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
        {/* Phase label */}
        <span className={`text-sm font-bold uppercase tracking-[0.3em] ${c.labelColor} transition-colors`}>
          {c.label}
        </span>

        {/* Time display */}
        <div
          className={`font-mono font-black tabular-nums transition-all ${c.text} ${
            isCountdown ? "scale-110" : "scale-100"
          }`}
          style={{ fontSize: "clamp(4.5rem, 22vw, 13rem)", lineHeight: 1, transition: "transform 0.1s" }}
        >
          {phase === "complete" ? (
            <span className="text-brand-400">✓</span>
          ) : (
            formatTimerDisplay(secondsLeft)
          )}
        </div>

        {/* Rep / Set counter */}
        <div className="flex items-center gap-8 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Rep</p>
            <p className="text-2xl font-bold text-white tabular-nums">
              {phase === "complete" ? totalReps : currentRep}
              <span className="text-white/30">/{totalReps}</span>
            </p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Set</p>
            <p className="text-2xl font-bold text-white tabular-nums">
              {phase === "complete" ? totalSets : currentSet}
              <span className="text-white/30">/{totalSets}</span>
            </p>
          </div>
        </div>

        {/* Rep dots */}
        {totalReps <= 12 && (
          <div className="flex items-center gap-2 flex-wrap justify-center max-w-xs">
            {Array.from({ length: totalReps }).map((_, i) => {
              const done =
                phase === "complete" ||
                currentRep > i + 1 ||
                (currentRep === i + 1 && phase === "rest") ||
                (currentRep === i + 1 && phase === "rest_between_sets");
              const active = currentRep === i + 1 && phase === "hang";
              return (
                <div
                  key={i}
                  className={`h-2.5 w-2.5 rounded-full transition-all ${
                    done ? "bg-brand-500" : active ? "bg-white scale-125" : "bg-white/20"
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Controls */}
      <div
        className="flex flex-col items-center gap-4 px-6 pb-8"
        style={{ paddingBottom: `max(env(safe-area-inset-bottom) + 1rem, 2rem)` }}
      >
        <div className="flex items-center gap-4 w-full max-w-xs">
          <button
            onClick={reset}
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-4 text-sm font-semibold text-white/60 transition hover:bg-white/10 hover:text-white active:scale-95"
          >
            Reset
          </button>
          <button
            onClick={toggle}
            className={`flex-[2] rounded-2xl py-4 text-lg font-bold transition active:scale-95 ${
              phase === "complete"
                ? "bg-brand-500/20 text-brand-400 border border-brand-500/30"
                : phase !== "idle"
                ? "bg-white/10 border border-white/20 text-white"
                : "bg-brand-500 text-black"
            }`}
          >
            {phase === "idle" ? "Start" : phase === "complete" ? "Done" : "Pause"}
          </button>
        </div>
        <p className="text-[10px] text-white/20">Press Space to start / pause</p>
      </div>

      {/* Back confirmation overlay */}
      {showBackConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6">
          <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-[#111] p-6 text-center shadow-2xl">
            <p className="text-base font-semibold text-white mb-1">Leave workout?</p>
            <p className="text-sm text-white/40 mb-5">Your timer progress will be lost.</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowBackConfirm(false); }}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white hover:bg-white/10 transition"
              >
                Keep going
              </button>
              <button
                onClick={() => { if (backHref) router.push(backHref); }}
                className="flex-1 rounded-xl bg-red-500/20 border border-red-500/30 py-3 text-sm font-medium text-red-400 hover:bg-red-500/30 transition"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

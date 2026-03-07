"use client";
import { useCallback, useEffect, useState } from "react";
import { useTimer } from "@/lib/hooks/useTimer";
import { formatTimerDisplay } from "@/lib/utils";
import type { WorkoutProtocol } from "@/types";

interface HangboardTimerProps {
  protocol: WorkoutProtocol;
  onComplete?: () => void;
}

export default function HangboardTimer({ protocol, onComplete }: HangboardTimerProps) {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { state, toggle, reset } = useTimer(protocol, {
    onComplete,
    enableAudio: audioEnabled,
    enableVibration: vibrationEnabled,
  });

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

  // Fullscreen API
  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const { phase, secondsLeft, currentRep, currentSet, totalReps, totalSets } = state;

  // Color scheme
  const colors = {
    idle: { bg: "bg-[#0a0a0a]", text: "text-white", label: "READY", labelColor: "text-white/40" },
    hang: { bg: "bg-[#0d1f14]", text: "text-brand-400", label: "HANG", labelColor: "text-brand-400" },
    rest: { bg: "bg-[#1a0a0a]", text: "text-red-400", label: "REST", labelColor: "text-red-400" },
    rest_between_sets: { bg: "bg-[#1a0a0a]", text: "text-orange-400", label: "SET REST", labelColor: "text-orange-400" },
    complete: { bg: "bg-[#0a0a0a]", text: "text-brand-400", label: "DONE", labelColor: "text-brand-400" },
  };

  const c = colors[phase];

  // Progress bar
  const totalTime =
    phase === "hang"
      ? protocol.hangTime
      : phase === "rest"
      ? protocol.restTime
      : phase === "rest_between_sets"
      ? protocol.restBetweenSets
      : 1;
  const progress = phase === "idle" || phase === "complete" ? 0 : ((totalTime - secondsLeft) / totalTime) * 100;

  // Countdown glow for last 3 seconds
  const isCountdown = secondsLeft <= 3 && secondsLeft > 0 && phase !== "idle" && phase !== "complete";

  return (
    <div className={`flex flex-col min-h-dvh ${c.bg} transition-colors duration-300`}>
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 md:p-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-white/30">
            {protocol.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAudioEnabled((v) => !v)}
            className={`rounded-lg p-2 transition ${audioEnabled ? "text-white/60" : "text-white/20"}`}
            title="Toggle audio"
          >
            {audioEnabled ? (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M7 7H3v6h4l5 4V3L7 7z" fill="currentColor"/>
                <path d="M15 7s2 1.5 2 3-2 3-2 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M7 7H3v6h4l5 4V3L7 7z" fill="currentColor" opacity="0.4"/>
                <path d="M14 14l4-4M18 14l-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )}
          </button>
          <button
            onClick={toggleFullscreen}
            className="rounded-lg p-2 text-white/60 transition hover:text-white"
            title="Toggle fullscreen"
          >
            {isFullscreen ? (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M7 3v4H3M17 3l-4 4M7 17v-4H3M17 17l-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
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
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8">
        {/* Phase label */}
        <div className="text-center">
          <span
            className={`timer-display text-sm font-bold uppercase tracking-[0.3em] ${c.labelColor} transition-colors`}
          >
            {c.label}
          </span>
        </div>

        {/* Time display */}
        <div
          className={`timer-display transition-all ${c.text} ${
            isCountdown ? "scale-110" : "scale-100"
          }`}
          style={{ fontSize: "clamp(5rem, 25vw, 14rem)", lineHeight: 1, transition: "transform 0.1s" }}
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
            <p className="text-xs uppercase tracking-widest text-white/30 mb-1">Rep</p>
            <p className="timer-display text-2xl font-bold text-white">
              {phase === "complete" ? totalReps : currentRep}
              <span className="text-white/30">/{totalReps}</span>
            </p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div>
            <p className="text-xs uppercase tracking-widest text-white/30 mb-1">Set</p>
            <p className="timer-display text-2xl font-bold text-white">
              {phase === "complete" ? totalSets : currentSet}
              <span className="text-white/30">/{totalSets}</span>
            </p>
          </div>
        </div>

        {/* Rep dots */}
        <div className="flex items-center gap-2">
          {Array.from({ length: totalReps }).map((_, i) => {
            const done =
              phase === "complete" ||
              (currentRep > i + 1) ||
              (currentRep === i + 1 && phase === "rest") ||
              (currentRep === i + 1 && phase === "rest_between_sets");
            const active = currentRep === i + 1 && phase === "hang";
            return (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-all ${
                  done
                    ? "bg-brand-500"
                    : active
                    ? "bg-white scale-125"
                    : "bg-white/20"
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-4 px-8 pb-10 md:pb-16">
        <div className="flex items-center gap-4">
          <button
            onClick={reset}
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white/60 transition hover:bg-white/10 hover:text-white active:scale-95"
          >
            Reset
          </button>
          <button
            onClick={toggle}
            className={`rounded-xl px-10 py-4 text-lg font-bold transition active:scale-95 ${
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
        <p className="text-xs text-white/20">Press Space to start/pause</p>
      </div>
    </div>
  );
}

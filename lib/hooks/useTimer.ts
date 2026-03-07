"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createBeep } from "@/lib/utils";
import type { TimerState, WorkoutProtocol } from "@/types";

interface UseTimerOptions {
  onComplete?: () => void;
  enableAudio?: boolean;
  enableVibration?: boolean;
}

const beepHigh = createBeep(1046, 0.12, 0.6); // C6 — hang start
const beepLow  = createBeep(523,  0.2,  0.6); // C5 — rest start
const beepCount = createBeep(880,  0.08, 0.4); // A5 — countdown tick
const beepDone  = createBeep(1318, 0.4,  0.7); // E6 — complete

export function useTimer(protocol: WorkoutProtocol, options: UseTimerOptions = {}) {
  const { onComplete, enableAudio = true, enableVibration = true } = options;

  const [state, setState] = useState<TimerState>({
    phase: "idle",
    secondsLeft: protocol.hangTime,
    currentRep: 1,
    currentSet: 1,
    totalReps: protocol.reps,
    totalSets: protocol.sets,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const vibrate = useCallback(
    (pattern: number[]) => {
      if (enableVibration && typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    },
    [enableVibration]
  );

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    setState((prev) => {
      const { phase, secondsLeft, currentRep, currentSet, totalReps, totalSets } = prev;

      // 3-2-1 countdown beeps
      if (secondsLeft <= 3 && secondsLeft > 0) {
        if (enableAudio) beepCount();
      }

      if (secondsLeft > 1) {
        return { ...prev, secondsLeft: secondsLeft - 1 };
      }

      // Phase transition
      if (phase === "hang") {
        const isLastRep = currentRep >= totalReps;
        const isLastSet = currentSet >= totalSets;

        if (isLastRep && isLastSet) {
          if (enableAudio) beepDone();
          vibrate([200, 100, 200]);
          return { ...prev, phase: "complete", secondsLeft: 0 };
        }

        if (isLastRep) {
          if (enableAudio) beepLow();
          vibrate([100]);
          return {
            ...prev,
            phase: "rest_between_sets",
            secondsLeft: protocol.restBetweenSets,
            currentRep: 1,
            currentSet: currentSet + 1,
          };
        }

        if (enableAudio) beepLow();
        vibrate([100]);
        return {
          ...prev,
          phase: "rest",
          secondsLeft: protocol.restTime,
          currentRep: currentRep + 1,
        };
      }

      if (phase === "rest" || phase === "rest_between_sets") {
        if (enableAudio) beepHigh();
        vibrate([150, 50, 150]);
        return { ...prev, phase: "hang", secondsLeft: protocol.hangTime };
      }

      return prev;
    });
  }, [
    protocol.hangTime,
    protocol.restTime,
    protocol.restBetweenSets,
    enableAudio,
    vibrate,
  ]);

  const start = useCallback(() => {
    setState((prev) => {
      if (prev.phase === "idle") {
        if (enableAudio) beepHigh();
        vibrate([150, 50, 150]);
        return { ...prev, phase: "hang", secondsLeft: protocol.hangTime };
      }
      return prev;
    });
  }, [protocol.hangTime, enableAudio, vibrate]);

  const pause = useCallback(() => {
    stopInterval();
    setState((prev) => ({ ...prev, phase: prev.phase === "idle" ? "idle" : "idle" }));
  }, [stopInterval]);

  const reset = useCallback(() => {
    stopInterval();
    setState({
      phase: "idle",
      secondsLeft: protocol.hangTime,
      currentRep: 1,
      currentSet: 1,
      totalReps: protocol.reps,
      totalSets: protocol.sets,
    });
  }, [protocol, stopInterval]);

  const toggle = useCallback(() => {
    if (stateRef.current.phase === "idle" || stateRef.current.phase === "complete") {
      if (stateRef.current.phase === "complete") {
        reset();
        return;
      }
      start();
    } else {
      // Pause: stop interval but keep phase
      stopInterval();
      setState((prev) => ({ ...prev, phase: "idle" }));
    }
  }, [start, reset, stopInterval]);

  // Start/stop interval based on phase
  useEffect(() => {
    if (
      state.phase !== "idle" &&
      state.phase !== "complete" &&
      !intervalRef.current
    ) {
      intervalRef.current = setInterval(tick, 1000);
    }

    if ((state.phase === "idle" || state.phase === "complete") && intervalRef.current) {
      stopInterval();
    }

    if (state.phase === "complete" && onComplete) {
      onComplete();
    }
  }, [state.phase, tick, stopInterval, onComplete]);

  // Keyboard spacebar
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [toggle]);

  // Cleanup
  useEffect(() => {
    return () => stopInterval();
  }, [stopInterval]);

  return { state, start, pause, reset, toggle };
}
